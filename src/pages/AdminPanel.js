import { useEffect, useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";

export default function AdminPanel() {
    const [users, setUsers] = useState([]);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const load = () => {
        api.get("/admin/users")
            .then(res => setUsers(res.data));
    };

    useEffect(load, []);

    const create = async () => {
        if (!username.trim() || !password.trim()) {
            alert("Заполните все поля");
            return;
        }
        setLoading(true);
        await api.post("/admin/users", {
            username,
            password,
            isAdmin: false
        });
        setUsername("");
        setPassword("");
        load();
        setLoading(false);
    };

    const remove = async (id) => {
        if (window.confirm("Удалить пользователя?")) {
            await api.delete(`/admin/users/${id}`);
            load();
        }
    };

    return (
        <div className="container fade-in">
            <div className="logo">EvaDeutche</div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2>Админ панель</h2>
                <button onClick={() => navigate("/dashboard")}>← Назад</button>
            </div>

            <div className="admin-card">
                <h3 style={{ marginBottom: 20, fontSize: 18 }}>Создать пользователя</h3>
                <div className="admin-input-group">
                    <input
                        placeholder="Имя пользователя"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                    />
                    <input
                        placeholder="Пароль"
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                    <button onClick={create} disabled={loading}>
                        {loading ? "Создание..." : "➕ Создать"}
                    </button>
                </div>
            </div>

            <div className="admin-card">
                <h3 style={{ marginBottom: 20, fontSize: 18 }}>Пользователи ({users.length})</h3>
                {users.length === 0 ? (
                    <p style={{ color: '#718096', textAlign: 'center' }}>Нет пользователей</p>
                ) : (
                    <ul className="user-list">
                        {users.map(u => (
                            <li key={u.id}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    👤 {u.username}
                                    {u.isAdmin && <span style={{ background: '#667eea', color: 'white', padding: '2px 8px', borderRadius: 20, fontSize: 11 }}>Admin</span>}
                                </span>
                                {!u.isAdmin && (
                                    <button className="danger" onClick={() => remove(u.id)}>
                                        🗑 Удалить
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}