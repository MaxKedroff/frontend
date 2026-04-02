import { useNavigate } from "react-router-dom";

export default function Dashboard({ user }) {
    const navigate = useNavigate();

    return (
        <div style={{ padding: 40 }}>
            <h2>Добро пожаловать, {user.username}</h2>

            <div className="grid">
                <div className="card" onClick={() => navigate("/boards")}>
                    🧠 Drawing Board
                </div>

                {user.isAdmin && (
                    <div className="card" onClick={() => navigate("/admin")}>
                        ⚙ Admin Panel
                    </div>
                )}
            </div>
        </div>
    );
}