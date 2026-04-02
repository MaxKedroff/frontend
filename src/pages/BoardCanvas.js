import { useEffect, useState, useRef } from "react";
import api from "../services/api";
import { useParams, useNavigate } from "react-router-dom";

export default function BoardCanvas() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [elements, setElements] = useState([]);
    const [tool, setTool] = useState("select");
    const [currentPath, setCurrentPath] = useState([]);
    const dragRef = useRef(null);
    const frame = useRef(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        api.get(`/boarddata/${id}`).then(res => {
            if (res.data.length > 0)
                setElements(JSON.parse(res.data[0].data));
        });
    }, [id]);

    const save = async (els) => {
        setElements(els);
        setSaving(true);
        await api.post("/boarddata", {
            boardId: id,
            type: "json",
            data: JSON.stringify(els)
        });
        setTimeout(() => setSaving(false), 500);
    };

    const addRect = () => {
        save([
            ...elements,
            { id: Date.now(), type: "rect", x: 100, y: 100, width: 120, height: 80 }
        ]);
    };

    const addText = () => {
        save([
            ...elements,
            { id: Date.now(), type: "text", text: "Новый текст", x: 150, y: 150 }
        ]);
    };

    const onMouseDown = (e, el) => {
        e.stopPropagation();
        if (tool === "draw") {
            setCurrentPath([[e.clientX, e.clientY]]);
            return;
        }
        dragRef.current = {
            id: el.id,
            offsetX: e.clientX - el.x,
            offsetY: e.clientY - el.y
        };
    };

    const onMouseMove = (e) => {
        if (tool === "draw") {
            if (currentPath.length > 0) {
                setCurrentPath(prev => [...prev, [e.clientX, e.clientY]]);
            }
            return;
        }

        if (!dragRef.current) return;
        if (frame.current) return;

        frame.current = requestAnimationFrame(() => {
            const { id, offsetX, offsetY } = dragRef.current;
            setElements(prev =>
                prev.map(el =>
                    el.id === id ? { ...el, x: e.clientX - offsetX, y: e.clientY - offsetY } : el
                )
            );
            frame.current = null;
        });
    };

    const onMouseUp = () => {
        if (tool === "draw" && currentPath.length > 1) {
            save([...elements, { id: Date.now(), type: "path", points: currentPath }]);
            setCurrentPath([]);
        }
        if (dragRef.current) {
            save(elements);
            dragRef.current = null;
        }
    };

    const onDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (!file || !file.type.startsWith("image")) return;

        const reader = new FileReader();
        reader.onload = () => {
            const rect = e.target.getBoundingClientRect();
            const newEl = {
                id: Date.now(),
                type: "image",
                src: reader.result,
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                width: 200,
                height: 150
            };
            save([...elements, newEl]);
        };
        reader.readAsDataURL(file);
    };

    const onDragOver = (e) => e.preventDefault();

    return (
        <div className="container" style={{ padding: '20px 40px' }}>
            <div className="logo">EvaDeutche</div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2>MIRO Board #{id}</h2>
                <button onClick={() => navigate("/boards")}>← Мои доски</button>
            </div>

            {saving && (
                <div style={{ position: 'fixed', bottom: 20, right: 20, background: '#48bb78', color: 'white', padding: '8px 16px', borderRadius: 20, fontSize: 12 }}>
                    💾 Сохранено
                </div>
            )}

            <div className="canvas-container">
                <div className="canvas-toolbar">
                    <button onClick={() => setTool("select")} style={tool === "select" ? { opacity: 0.8 } : {}}>
                        🖱 Select
                    </button>
                    <button onClick={() => setTool("draw")} style={tool === "draw" ? { opacity: 0.8 } : {}}>
                        ✏️ Draw
                    </button>
                    <button onClick={addRect}>⬛ Rect</button>
                    <button onClick={addText}>📝 Text</button>
                    <span style={{ marginLeft: 'auto', fontSize: 12, color: '#718096' }}>
                        💡 Перетащите изображение
                    </span>
                </div>

                <div
                    className="canvas-area"
                    onMouseMove={onMouseMove}
                    onMouseUp={onMouseUp}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                >
                    {elements.map(el => {
                        if (el.type === "rect") {
                            return (
                                <div
                                    key={el.id}
                                    onMouseDown={(e) => onMouseDown(e, el)}
                                    className="canvas-element"
                                    style={{
                                        position: "absolute",
                                        left: el.x,
                                        top: el.y,
                                        width: el.width,
                                        height: el.height,
                                        background: "white",
                                        border: "2px solid #667eea",
                                        borderRadius: 8,
                                        cursor: tool === "select" ? "move" : "default",
                                        userSelect: "none",
                                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                                    }}
                                />
                            );
                        }
                        if (el.type === "text") {
                            return (
                                <div
                                    key={el.id}
                                    onMouseDown={(e) => onMouseDown(e, el)}
                                    style={{
                                        position: "absolute",
                                        left: el.x,
                                        top: el.y,
                                        userSelect: "none",
                                        cursor: tool === "select" ? "move" : "default",
                                        fontSize: 16,
                                        background: "white",
                                        padding: "4px 8px",
                                        borderRadius: 8,
                                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
                                    }}
                                >
                                    {el.text}
                                </div>
                            );
                        }
                        if (el.type === "path") {
                            return (
                                <svg key={el.id} style={{ position: "absolute", left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                                    <polyline
                                        points={el.points.map(p => p.join(",")).join(" ")}
                                        stroke="#667eea"
                                        strokeWidth="3"
                                        fill="none"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            );
                        }
                        if (el.type === "image") {
                            return (
                                <img
                                    key={el.id}
                                    src={el.src}
                                    alt=""
                                    onMouseDown={(e) => onMouseDown(e, el)}
                                    className="canvas-element"
                                    style={{
                                        position: "absolute",
                                        left: el.x,
                                        top: el.y,
                                        width: el.width,
                                        cursor: tool === "select" ? "move" : "default",
                                        userSelect: "none",
                                        borderRadius: 8,
                                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                                    }}
                                />
                            );
                        }
                        return null;
                    })}

                    {tool === "draw" && currentPath.length > 0 && (
                        <svg style={{ position: "absolute", left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                            <polyline
                                points={currentPath.map(p => p.join(",")).join(" ")}
                                stroke="#667eea"
                                strokeWidth="3"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                opacity={0.6}
                            />
                        </svg>
                    )}
                </div>
            </div>
        </div>
    );
}