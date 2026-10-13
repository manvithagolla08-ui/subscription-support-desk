import test from 'node:test'
import assert from 'node:assert/strict'
import jwt from 'jsonwebtoken'
import express from 'express'
import cookieParser from 'cookie-parser'
import { verifyToken } from '../middlewares/verifyToken.js'
import { allowedRoles } from '../middlewares/allowedRoles.js'

const TEST_SECRET = 'test_secret_key_12345'
process.env.SECRET_KEY = TEST_SECRET

function createMockRes() {
    const res = {
        statusCode: 200,
        responseData: null,
        status(code) {
            this.statusCode = code
            return this
        },
        json(data) {
            this.responseData = data
            return this
        }
    }
    return res
}

test('verifyToken: returns 401 when accessToken cookie is missing', () => {
    const req = { cookies: {} }
    const res = createMockRes()
    let nextCalled = false

    verifyToken(req, res, () => { nextCalled = true })

    assert.equal(nextCalled, false)
    assert.equal(res.statusCode, 401)
    assert.deepEqual(res.responseData, {
        success: false,
        message: 'you must login first'
    })
})

test('verifyToken: returns 401 when token is invalid', () => {
    const req = { cookies: { accessToken: 'invalid.jwt.token' } }
    const res = createMockRes()
    let nextCalled = false

    verifyToken(req, res, () => { nextCalled = true })

    assert.equal(nextCalled, false)
    assert.equal(res.statusCode, 401)
    assert.deepEqual(res.responseData, {
        success: false,
        message: 'invalid or expired token'
    })
})

test('verifyToken: returns 401 when token is expired', () => {
    const expiredToken = jwt.sign(
        { id: '123', role: 'CUSTOMER' },
        TEST_SECRET,
        { expiresIn: '-1s' }
    )
    const req = { cookies: { accessToken: expiredToken } }
    const res = createMockRes()
    let nextCalled = false

    verifyToken(req, res, () => { nextCalled = true })

    assert.equal(nextCalled, false)
    assert.equal(res.statusCode, 401)
    assert.deepEqual(res.responseData, {
        success: false,
        message: 'invalid or expired token'
    })
})

test('verifyToken: successfully sets req.user and calls next() on valid token', () => {
    const payload = { id: 'user_123', role: 'CUSTOMER' }
    const token = jwt.sign(payload, TEST_SECRET, { expiresIn: '1h' })
    const req = { cookies: { accessToken: token } }
    const res = createMockRes()
    let nextCalled = false

    verifyToken(req, res, () => { nextCalled = true })

    assert.equal(nextCalled, true)
    assert.equal(req.user.id, 'user_123')
    assert.equal(req.user.role, 'CUSTOMER')
})

test('allowedRoles: allows matching single role', () => {
    const middleware = allowedRoles('CUSTOMER')
    const req = { user: { role: 'CUSTOMER' } }
    const res = createMockRes()
    let nextCalled = false

    middleware(req, res, () => { nextCalled = true })

    assert.equal(nextCalled, true)
})

test('allowedRoles: allows matching role among multiple allowed roles', () => {
    const middleware = allowedRoles('SPECIALIST', 'SUPERVISOR')

    for (const role of ['SPECIALIST', 'SUPERVISOR']) {
        const req = { user: { role } }
        const res = createMockRes()
        let nextCalled = false

        middleware(req, res, () => { nextCalled = true })

        assert.equal(nextCalled, true, `Role ${role} should be allowed`)
    }
})

test('allowedRoles: returns 403 when role is unauthorized', () => {
    const middleware = allowedRoles('CUSTOMER')

    for (const role of ['SPECIALIST', 'KNOWLEDGE_MANAGER', 'SUPERVISOR']) {
        const req = { user: { role } }
        const res = createMockRes()
        let nextCalled = false

        middleware(req, res, () => { nextCalled = true })

        assert.equal(nextCalled, false, `Role ${role} should not call next`)
        assert.equal(res.statusCode, 403)
        assert.deepEqual(res.responseData, {
            success: false,
            message: 'you are not authorized to access'
        })
    }
})

test('Role access matrix for all 4 roles across all protected route role rules', () => {
    const roles = ['CUSTOMER', 'SPECIALIST', 'KNOWLEDGE_MANAGER', 'SUPERVISOR']

    const routes = [
        {
            name: 'Ticket creation & view (POST/GET /api/tickets)',
            allowed: ['CUSTOMER']
        },
        {
            name: 'Ticket update (PATCH /api/tickets/:id)',
            allowed: ['SPECIALIST', 'SUPERVISOR']
        },
        {
            name: 'Help article drafts & publish (POST /api/help/drafts*)',
            allowed: ['KNOWLEDGE_MANAGER']
        }
    ]

    for (const route of routes) {
        const middleware = allowedRoles(...route.allowed)
        for (const role of roles) {
            const req = { user: { role } }
            const res = createMockRes()
            let nextCalled = false

            middleware(req, res, () => { nextCalled = true })

            const shouldPass = route.allowed.includes(role)
            assert.equal(
                nextCalled,
                shouldPass,
                `Role ${role} on ${route.name} expected allowed=${shouldPass}`
            )
            if (!shouldPass) {
                assert.equal(res.statusCode, 403)
            }
        }
    }
})

test('HTTP integration: middleware pipeline blocks unauthenticated, blocks unauthorized roles, and allows authorized roles', async (t) => {
    const app = express()
    app.use(cookieParser())

    // Route allowing only SPECIALIST and SUPERVISOR (simulating PATCH /api/tickets/:id)
    app.patch('/api/tickets/:id', verifyToken, allowedRoles('SPECIALIST', 'SUPERVISOR'), (req, res) => {
        res.status(200).json({ success: true, message: 'ticket updated' })
    })

    const server = await new Promise((resolve) => {
        const s = app.listen(0, () => resolve(s))
    })
    const port = server.address().port
    const url = `http://127.0.0.1:${port}/api/tickets/123`

    t.after(() => {
        server.close()
    })

    // 1. Missing cookie -> 401
    const resNoAuth = await fetch(url, { method: 'PATCH' })
    assert.equal(resNoAuth.status, 401)
    const dataNoAuth = await resNoAuth.json()
    assert.equal(dataNoAuth.message, 'you must login first')

    // 2. CUSTOMER (unauthorized) -> 403
    const custToken = jwt.sign({ id: 'c1', role: 'CUSTOMER' }, TEST_SECRET)
    const resCust = await fetch(url, {
        method: 'PATCH',
        headers: { Cookie: `accessToken=${custToken}` }
    })
    assert.equal(resCust.status, 403)
    const dataCust = await resCust.json()
    assert.equal(dataCust.message, 'you are not authorized to access')

    // 3. KNOWLEDGE_MANAGER (unauthorized) -> 403
    const kmToken = jwt.sign({ id: 'km1', role: 'KNOWLEDGE_MANAGER' }, TEST_SECRET)
    const resKm = await fetch(url, {
        method: 'PATCH',
        headers: { Cookie: `accessToken=${kmToken}` }
    })
    assert.equal(resKm.status, 403)

    // 4. SPECIALIST (authorized) -> 200
    const specToken = jwt.sign({ id: 's1', role: 'SPECIALIST' }, TEST_SECRET)
    const resSpec = await fetch(url, {
        method: 'PATCH',
        headers: { Cookie: `accessToken=${specToken}` }
    })
    assert.equal(resSpec.status, 200)
    const dataSpec = await resSpec.json()
    assert.equal(dataSpec.message, 'ticket updated')

    // 5. SUPERVISOR (authorized) -> 200
    const supToken = jwt.sign({ id: 'sup1', role: 'SUPERVISOR' }, TEST_SECRET)
    const resSup = await fetch(url, {
        method: 'PATCH',
        headers: { Cookie: `accessToken=${supToken}` }
    })
    assert.equal(resSup.status, 200)
})

