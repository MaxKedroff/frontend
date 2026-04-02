import { useEffect, useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";

export default function Boards({ user }) {
    const [boards, setBoards] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        api.get(`/boards/${user.id}`)
            .then(res => setBoards(res.data));
    }, []);

    return (
        <div style={{ padding: 40 }}>
            <h2>���� �����</h2>

            <div className="grid">
                {boards.map(b => (
                    <div
                        key={b.id}
                        className="card"
                        onClick={() => navigate(`/board/${b.id}`)}
                    >
                        {b.name}
                    </div>
                ))}
            </div>
        </div>
    );
}