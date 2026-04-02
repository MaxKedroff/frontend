import { useEffect, useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";

export default function Boards({ user }) {
    const [boards, setBoards] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        api.get(`/boards/${user.id}`)
            .then(res => {
                setBoards(res.data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [user.id]);

    return (
        <div className="container fade-in">
            <div className="logo">EvaDeutche</div>

            <div className="boards-header">
                <h2>Мои доски</h2>
                <button onClick={() => navigate("/dashboard")}>← Назад</button>
            </div>

            {loading ? (
                <p style={{ textAlign: 'center', color: 'white' }}>Загрузка...</p>
            ) : boards.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', cursor: 'default' }}>
                    <p>У вас пока нет досок</p>
                </div>
            ) : (
                <div className="grid">
                    {boards.map(b => (
                        <div
                            key={b.id}
                            className="card"
                            onClick={() => navigate(`/board/${b.id}`)}
                        >
                            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                            <h3>{b.name}</h3>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}