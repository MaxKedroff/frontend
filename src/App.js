import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Boards from "./pages/Boards";
import BoardCanvas from "./pages/BoardCanvas";
import AdminPanel from "./pages/AdminPanel";

function App() {
    const [user, setUser] = useState(null);

    if (!user) return <Login setUser={setUser} />;

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Dashboard user={user} />} />
                <Route path="/boards" element={<Boards user={user} />} />
                <Route path="/board/:id" element={<BoardCanvas />} />
                <Route path="/admin" element={<AdminPanel />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;