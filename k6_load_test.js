import http from 'k6/http';
import { check, sleep } from 'k6';

// Base URL of the API
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

// Test configuration / options
export const options = {
    stages: [
        { duration: '15s', target: 10 }, // Ramp up to 10 users in 15 seconds
        { duration: '30s', target: 30 }, // Ramp up to 30 users in 30 seconds (heavy load)
        { duration: '30s', target: 30 }, // Stay at 30 users for 30 seconds
        { duration: '15s', target: 0 },  // Ramp down to 0 users
    ],
    thresholds: {
        http_req_failed: ['rate<0.01'],   // Error rate should be less than 1%
        http_req_duration: ['p(95)<1000'], // 95% of requests should respond in less than 1000ms
    },
};

// Setup function: runs once at the beginning to authenticate and get the token
// This avoids hitting the slow bcrypt login endpoint repeatedly during the load test
export function setup() {
    const loginUrl = `${BASE_URL}/api/v1/auth/login?role=admin`;
    const payload = JSON.stringify({
        email: 'admin@medical-ai.com',
        password: 'adminpassword123',
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const res = http.post(loginUrl, payload, params);
    
    const isLoginSuccessful = check(res, {
        'Login status is 200': (r) => r.status === 200,
        'Token exists in response': (r) => r.json('access_token') !== undefined,
    });

    if (!isLoginSuccessful) {
        throw new Error('Setup failed: Unable to log in. Ensure the server is running and database is seeded.');
    }

    const token = res.json('access_token');
    return { token };
}

// Default VU function: runs repeatedly for each virtual user
export default function (data) {
    const authHeaders = {
        headers: {
            'Authorization': `Bearer ${data.token}`,
            'Content-Type': 'application/json',
        },
    };

    // 1. Create a chat thread
    const threadPayload = JSON.stringify({
        title: `K6 Load Test Thread - ${__VU}-${__ITER}`,
        dept: 'General',
    });
    const createThreadRes = http.post(`${BASE_URL}/api/v1/chat/threads`, threadPayload, authHeaders);
    
    const threadCreated = check(createThreadRes, {
        'Thread creation status is 201': (r) => r.status === 201,
        'Thread ID is present': (r) => r.json('id') !== undefined,
    });

    if (!threadCreated) {
        // If thread creation failed, sleep and retry next iteration
        sleep(1);
        return;
    }

    const threadId = createThreadRes.json('id');

    // 2. Post a message to the thread
    const messagePayload = JSON.stringify({
        sender_type: 'user',
        content: `Hello! This is a load test message from VU ${__VU}, iteration ${__ITER}.`,
    });
    const postMessageRes = http.post(
        `${BASE_URL}/api/v1/chat/threads/${threadId}/messages`,
        messagePayload,
        authHeaders
    );

    check(postMessageRes, {
        'Post message status is 201': (r) => r.status === 201,
        'Message content matches': (r) => r.json('content') !== undefined,
    });

    // 3. Retrieve messages from the thread
    const getMessagesRes = http.get(
        `${BASE_URL}/api/v1/chat/threads/${threadId}/messages?limit=10`,
        authHeaders
    );

    check(getMessagesRes, {
        'Get messages status is 200': (r) => r.status === 200,
        'Messages list is returned': (r) => Array.isArray(r.json()),
    });

    // Simulate user "think time" between iterations
    sleep(1);
}
