import { useEffect, useState } from "react";
import api from "../services/api";

export default function AdminPanel() {
    const [users, setUsers] = useState([]);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const load = () => {
        api.get("/admin/users")
            .then(res => setUsers(res.data));
    };

    useEffect(load, []);

    const create = async () => {
        await api.post("/admin/users", {
            username,
            password,
            isAdmin: false
        });

        load();
    };

    const remove = async (id) => {
        await api.delete(`/admin/users/${id}`);
        load();
    };

    return (
        <div style={{ padding: 40 }}>
            <h2>Админка</h2>

            <input placeholder="username" onChange={e => setUsername(e.target.value)} />
            <input placeholder="password" onChange={e => setPassword(e.target.value)} />
            <button onClick={create}>Создать</button>

            <ul>
                {users.map(u => (
                    <li key={u.id}>
                        {u.username}
                        <button onClick={() => remove(u.id)}>Удалить</button>
                    </li>
                ))}
            </ul>
        </div>
    );
}