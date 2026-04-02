import { useState } from "react";
import api from "../services/api";

export default function Login({ setUser }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const login = async () => {
        setLoading(true);
        try {
            const res = await api.post("/auth/login", {
                username,
                password
            });
            setUser(res.data);
        } catch {
            alert("Ошибка входа");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="logo" style={{ position: 'absolute', top: 24, right: 32, color: 'white', background: 'none' }}>
                EvaDeutche
            </div>
            <div className="login-card fade-in">
                <h2>Добро пожаловать!</h2>
                <input
                    placeholder="Имя пользователя"
                    onChange={e => setUsername(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && login()}
                />
                <input
                    type="password"
                    placeholder="Пароль"
                    onChange={e => setPassword(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && login()}
                />
                <button onClick={login} disabled={loading}>
                    {loading ? "Вход..." : "Войти"}
                </button>
            </div>
        </div>
    );
}