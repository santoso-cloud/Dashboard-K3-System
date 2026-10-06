const API_URL =
    "http://localhost:5000/api";


// =====================================================
// TOKEN
// =====================================================

function getToken() {

    return localStorage.getItem(
        "token"
    );

}


// =====================================================
// USER
// =====================================================

function getUser() {

    const data =
        localStorage.getItem(
            "user"
        );

    if (!data) {
        return null;
    }

    try {

        return JSON.parse(data);

    } catch {

        return null;

    }

}


// =====================================================
// PROTECT PAGE
// =====================================================

function requireLogin() {

    const token =
        getToken();

    if (!token) {

        window.location.href =
            "login.html";

        return false;
    }

    return true;

}


// =====================================================
// LOGOUT
// =====================================================

function logout() {

    localStorage.removeItem(
        "token"
    );

    localStorage.removeItem(
        "user"
    );

    window.location.href =
        "login.html";

}


// =====================================================
// API FETCH
// =====================================================

async function apiFetch(
    endpoint,
    options = {}
) {

    const token =
        getToken();


    const headers = {
        ...(options.headers || {})
    };


    if (token) {

        headers.Authorization =
            `Bearer ${token}`;

    }


    if (
        options.body &&
        typeof options.body ===
        "object"
    ) {

        headers["Content-Type"] =
            "application/json";

        options.body =
            JSON.stringify(
                options.body
            );

    }


    const response =
        await fetch(
            `${API_URL}${endpoint}`,
            {
                ...options,
                headers
            }
        );


    if (
        response.status === 401
    ) {

        logout();

        return null;

    }


    const result =
        await response.json();


    if (!response.ok) {

        throw new Error(
            result.message ||
            "Request gagal"
        );

    }


    return result;

}