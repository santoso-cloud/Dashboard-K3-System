const API_URL =
    "http://localhost:5000/api";


const loginForm =
    document.getElementById(
        "loginForm"
    );

const usernameInput =
    document.getElementById(
        "username"
    );

const passwordInput =
    document.getElementById(
        "password"
    );

const loginButton =
    document.getElementById(
        "loginButton"
    );

const message =
    document.getElementById(
        "message"
    );

const togglePassword =
    document.getElementById(
        "togglePassword"
    );


// =====================================================
// JIKA SUDAH LOGIN
// =====================================================

if (
    localStorage.getItem("token")
) {

    window.location.href =
        "index.html";

}


// =====================================================
// PASSWORD TOGGLE
// =====================================================

togglePassword.addEventListener(
    "click",
    () => {

        const icon =
            togglePassword.querySelector(
                "i"
            );


        if (
            passwordInput.type ===
            "password"
        ) {

            passwordInput.type =
                "text";

            icon.className =
                "fa-solid fa-eye-slash";

        } else {

            passwordInput.type =
                "password";

            icon.className =
                "fa-solid fa-eye";

        }

    }
);


// =====================================================
// MESSAGE
// =====================================================

function showError(text) {

    message.textContent = text;

    message.classList.add(
        "show"
    );

}


function hideError() {

    message.textContent = "";

    message.classList.remove(
        "show"
    );

}


// =====================================================
// LOGIN
// =====================================================

loginForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        hideError();


        const username =
            usernameInput.value.trim();

        const password =
            passwordInput.value;


        if (!username || !password) {

            showError(
                "Username dan password wajib diisi."
            );

            return;
        }


        loginButton.disabled =
            true;

        loginButton.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            &nbsp;
            Memproses...
        `;


        try {

            const response =
                await fetch(
                    `${API_URL}/auth/login`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                username,
                                password
                            })
                    }
                );


            const result =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    result.message ||
                    "Login gagal"
                );

            }


            // Simpan JWT
            localStorage.setItem(
                "token",
                result.token
            );


            // Simpan user
            localStorage.setItem(
                "user",
                JSON.stringify(
                    result.user
                )
            );


            // Masuk dashboard
            window.location.href =
                "index.html";


        } catch (error) {

            console.error(
                error
            );

            showError(
                error.message ||
                "Tidak dapat terhubung ke server."
            );


            loginButton.disabled =
                false;

            loginButton.innerHTML = `
                <i class="fa-solid fa-right-to-bracket"></i>
                &nbsp;
                Masuk ke Sistem
            `;

        }

    }
);