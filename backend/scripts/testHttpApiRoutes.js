import dns from 'node:dns'
import { config } from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

config({ path: path.resolve(__dirname, '../.env') })
dns.setServers(['8.8.8.8', '8.8.4.4'])

const mockDataPath = path.resolve(__dirname, 'mockData.json')
const mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'))

const BASE_URL = `http://localhost:${process.env.PORT || 5000}`

async function loginUser(email, password) {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })

    const cookieHeader = res.headers.get('set-cookie')
    let accessTokenCookie = ''
    if (cookieHeader) {
        // extract accessToken cookie
        const match = cookieHeader.match(/accessToken=[^;]+/)
        if (match) {
            accessTokenCookie = match[0]
        }
    }

    const json = await res.json()
    return { status: res.status, json, cookie: accessTokenCookie }
}

async function runApiTests() {
    console.log('====================================================')
    console.log(' HTTP ROUTE & AUTHORIZATION ISOLATION TEST')
    console.log(` Target Server: ${BASE_URL}`)
    console.log('====================================================\n')

    const testResults = []

    function logTest(name, passed, expected, actual, message) {
        testResults.push({ name, passed, expected, actual, message })
        const badge = passed ? '✅ PASS' : '❌ FAIL'
        console.log(`${badge} | ${name}`)
        console.log(`       Expected: ${expected} | Actual: ${actual} | Note: ${message}`)
    }

    // 1. Log in users
    console.log('Logging in mock users...')
    const aliceAuth = await loginUser(mockData.users.customerApex.email, 'Password123!')
    const bobAuth = await loginUser(mockData.users.customerNexus.email, 'Password123!')
    const charlieAuth = await loginUser(mockData.users.customerUnaffiliated.email, 'Password123!')
    const sarahAuth = await loginUser(mockData.users.specialistApex.email, 'Password123!')

    logTest(
        'Login Alice (Customer of Apex)',
        aliceAuth.status === 200 && !!aliceAuth.cookie,
        'Status 200 with accessToken cookie',
        `Status ${aliceAuth.status}`,
        aliceAuth.json.message
    )

    logTest(
        'Login Bob (Customer of Nexus)',
        bobAuth.status === 200 && !!bobAuth.cookie,
        'Status 200 with accessToken cookie',
        `Status ${bobAuth.status}`,
        bobAuth.json.message
    )

    logTest(
        'Login Charlie (Unaffiliated Customer)',
        charlieAuth.status === 200 && !!charlieAuth.cookie,
        'Status 200 with accessToken cookie',
        `Status ${charlieAuth.status}`,
        charlieAuth.json.message
    )

    logTest(
        'Login Sarah (Specialist in Apex)',
        sarahAuth.status === 200 && !!sarahAuth.cookie,
        'Status 200 with accessToken cookie',
        `Status ${sarahAuth.status}`,
        sarahAuth.json.message
    )

    // 2. Test Legitimate Ticket Creation: Alice creating ticket in Apex (Org A)
    let aliceCreatedTicketId = null
    const aliceTicketRes = await fetch(`${BASE_URL}/api/tickets`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': aliceAuth.cookie
        },
        body: JSON.stringify({
            organizationId: mockData.organizations.apex.id,
            title: 'Apex Database latency high',
            description: 'Queries are timing out in US-East-1',
            priority: 'HIGH'
        })
    })
    const aliceTicketJson = await aliceTicketRes.json()
    if (aliceTicketJson.data) {
        aliceCreatedTicketId = aliceTicketJson.data._id
    }
    logTest(
        'TC-01: Customer 1 creates ticket in their own Org (Apex)',
        aliceTicketRes.status === 201,
        'Status 201 Created',
        `Status ${aliceTicketRes.status}`,
        aliceTicketJson.message
    )

    // 3. Test Cross-Tenant Attack: Alice trying to create ticket in Nexus (Org B) by changing organizationId
    const aliceCrossRes = await fetch(`${BASE_URL}/api/tickets`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': aliceAuth.cookie
        },
        body: JSON.stringify({
            organizationId: mockData.organizations.nexus.id,
            title: 'Cross-Tenant Exploit Attempt',
            description: 'Alice attempting to inject ticket into Nexus organization',
            priority: 'HIGH'
        })
    })
    const aliceCrossJson = await aliceCrossRes.json()
    logTest(
        'TC-02: Customer 1 attempts ticket creation with Org B ID (Cross-Tenant Tampering)',
        aliceCrossRes.status === 403,
        'Status 403 Forbidden ("You are not a customer of this organization")',
        `Status ${aliceCrossRes.status}`,
        aliceCrossJson.message
    )

    // 4. Test Cross-Tenant Attack: Bob trying to create ticket in Apex (Org A)
    const bobCrossRes = await fetch(`${BASE_URL}/api/tickets`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': bobAuth.cookie
        },
        body: JSON.stringify({
            organizationId: mockData.organizations.apex.id,
            title: 'Cross-Tenant Exploit Attempt 2',
            description: 'Bob attempting to inject ticket into Apex organization',
            priority: 'MEDIUM'
        })
    })
    const bobCrossJson = await bobCrossRes.json()
    logTest(
        'TC-03: Customer 2 attempts ticket creation with Org A ID (Cross-Tenant Tampering)',
        bobCrossRes.status === 403,
        'Status 403 Forbidden ("You are not a customer of this organization")',
        `Status ${bobCrossRes.status}`,
        bobCrossJson.message
    )

    // 5. Test Unaffiliated Customer: Charlie attempting to create ticket in Apex
    const charlieRes = await fetch(`${BASE_URL}/api/tickets`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': charlieAuth.cookie
        },
        body: JSON.stringify({
            organizationId: mockData.organizations.apex.id,
            title: 'Unauthorized Customer Ticket',
            description: 'Charlie has no membership anywhere',
            priority: 'LOW'
        })
    })
    const charlieJson = await charlieRes.json()
    logTest(
        'TC-04: Customer with no membership attempts ticket creation',
        charlieRes.status === 403,
        'Status 403 Forbidden ("You are not a customer of this organization")',
        `Status ${charlieRes.status}`,
        charlieJson.message
    )

    // 6. Test Request Validation: Missing required fields
    const missingFieldsRes = await fetch(`${BASE_URL}/api/tickets`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': aliceAuth.cookie
        },
        body: JSON.stringify({
            organizationId: mockData.organizations.apex.id
            // title and description omitted
        })
    })
    const missingFieldsJson = await missingFieldsRes.json()
    logTest(
        'TC-05: Request validation - Missing required title and description',
        missingFieldsRes.status === 400,
        'Status 400 Bad Request',
        `Status ${missingFieldsRes.status}`,
        missingFieldsJson.message
    )

    // 7. Test Request Validation: Malformed organizationId
    const malformedOrgRes = await fetch(`${BASE_URL}/api/tickets`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': aliceAuth.cookie
        },
        body: JSON.stringify({
            organizationId: 'not-a-valid-object-id',
            title: 'Test Title',
            description: 'Test Description'
        })
    })
    const malformedOrgJson = await malformedOrgRes.json()
    logTest(
        'TC-06: Request validation - Malformed organizationId string',
        malformedOrgRes.status === 400,
        'Status 400 Bad Request',
        `Status ${malformedOrgRes.status}`,
        malformedOrgJson.message
    )

    // 8. Test Request Validation: Extra unpermitted fields
    const extraFieldsRes = await fetch(`${BASE_URL}/api/tickets`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': aliceAuth.cookie
        },
        body: JSON.stringify({
            organizationId: mockData.organizations.apex.id,
            title: 'Valid Title',
            description: 'Valid Description',
            status: 'RESOLVED', // Customer not allowed to set status directly
            arbitraryField: 'attack'
        })
    })
    const extraFieldsJson = await extraFieldsRes.json()
    logTest(
        'TC-07: Request validation - Rejected extra/protected fields',
        extraFieldsRes.status === 400,
        'Status 400 Bad Request ("Invalid fields in request body")',
        `Status ${extraFieldsRes.status}`,
        extraFieldsJson.message
    )

    // 9. Test Ticket Creator Isolation: Alice accessing Bob's ticket
    const bobTicketId = mockData.tickets.ticketBobNexus.id
    const aliceAccessBobTicketRes = await fetch(`${BASE_URL}/api/tickets/${bobTicketId}`, {
        method: 'GET',
        headers: {
            'Cookie': aliceAuth.cookie
        }
    })
    const aliceAccessBobTicketJson = await aliceAccessBobTicketRes.json()
    logTest(
        'TC-08: Cross-Customer Ticket View Isolation (Alice attempts to view Bob ticket)',
        aliceAccessBobTicketRes.status === 403,
        'Status 403 Forbidden ("you are not authorized to view this ticket")',
        `Status ${aliceAccessBobTicketRes.status}`,
        aliceAccessBobTicketJson.message
    )

    // 10. Test Staff Isolation: Specialist Sarah (Apex) attempting to update Bob's ticket in Nexus Org
    const sarahUpdateBobTicketRes = await fetch(`${BASE_URL}/api/tickets/${bobTicketId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': sarahAuth.cookie
        },
        body: JSON.stringify({
            status: 'IN_PROGRESS',
            priority: 'HIGH'
        })
    })
    const sarahUpdateBobTicketJson = await sarahUpdateBobTicketRes.json()
    logTest(
        'TC-09: Staff Cross-Organization Isolation (Specialist Sarah updates Nexus Ticket)',
        sarahUpdateBobTicketRes.status === 403,
        'Status 403 Forbidden ("you are not authorized to update tickets in this organization")',
        `Status ${sarahUpdateBobTicketRes.status}`,
        sarahUpdateBobTicketJson.message
    )

    // 11. Test Staff Legitimate Update: Specialist Sarah updates Alice's ticket in Apex Org
    if (aliceCreatedTicketId) {
        const sarahUpdateAliceTicketRes = await fetch(`${BASE_URL}/api/tickets/${aliceCreatedTicketId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': sarahAuth.cookie
            },
            body: JSON.stringify({
                status: 'IN_PROGRESS',
                priority: 'HIGH'
            })
        })
        const sarahUpdateAliceTicketJson = await sarahUpdateAliceTicketRes.json()
        logTest(
            'TC-10: Staff Legitimate Update (Specialist Sarah updates Apex Ticket)',
            sarahUpdateAliceTicketRes.status === 200,
            'Status 200 OK ("ticket updated successfully")',
            `Status ${sarahUpdateAliceTicketRes.status}`,
            sarahUpdateAliceTicketJson.message
        )
    }

    console.log('\n====================================================')
    console.log(' HTTP TEST SUMMARY')
    console.log('====================================================')
    const passedCount = testResults.filter(t => t.passed).length
    console.log(`Total Scenarios: ${testResults.length}`)
    console.log(`Passed: ${passedCount}`)
    console.log(`Failed: ${testResults.length - passedCount}`)

    return testResults
}

runApiTests().then(() => {
    process.exit(0)
}).catch(err => {
    console.error('API Test Error:', err)
    process.exit(1)
})
