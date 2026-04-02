import { useState } from "react";
import api from "../services/api";

export default function Login({ setUser }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const login = async () => {
        try {
            const res = await api.post("/auth/login", {
                username,
                password
            });

            setUser(res.data);
        } catch {
            alert("Ошибка входа");
        }
    };

    return (
        <div style={{ textAlign: "center", marginTop: 100 }}>
            <h2>Login</h2>

            <input
                placeholder="Username"
                onChange={e => setUsername(e.target.value)}
            /><br /><br />

            <input
                type="password"
                placeholder="Password"
                onChange={e => setPassword(e.target.value)}
            /><br /><br />

            <button onClick={login}>Login</button>
        </div>
    );
}