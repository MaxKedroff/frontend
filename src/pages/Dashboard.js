import { useNavigate } from "react-router-dom";

export default function Dashboard({ user }) {
    const navigate = useNavigate();

    return (
        <div className="container fade-in">
            <div className="logo">EvaDeutche</div>

            <div className="dashboard-header">
                <h2>Панель управления</h2>
                <p className="welcome-text">Добро пожаловать, {user.username}!</p>
            </div>

            <div className="grid">
                <div className="card" onClick={() => navigate("/boards")}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🧠</div>
                    <h3>Drawing Board</h3>
                    <p style={{ color: '#718096', marginTop: 8, fontSize: 14 }}>Создавайте и редактируйте доски</p>
                </div>

                {user.isAdmin && (
                    <div className="card" onClick={() => navigate("/admin")}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>⚙️</div>
                        <h3>Admin Panel</h3>
                        <p style={{ color: '#718096', marginTop: 8, fontSize: 14 }}>Управление пользователями</p>
                    </div>
                )}
            </div>
        </div>
    );
}