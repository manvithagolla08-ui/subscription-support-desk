import test from 'node:test'
import assert from 'node:assert/strict'
import jwt from 'jsonwebtoken'
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
