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
    const [saveTimeout, setSaveTimeout] = useState(null);

    // Загрузка доски
    useEffect(() => {
        loadBoard();
    }, [id]);

    const loadBoard = async () => {
        try {
            const res = await api.get(`/boarddata/${id}`);
            if (res.data && res.data.length > 0) {
                // Преобразуем данные из БД в формат для отображения
                const loadedElements = res.data.map(el => ({
                    id: el.id,
                    type: el.type,
                    x: el.x,
                    y: el.y,
                    width: el.width || (el.type === "rect" ? 120 : 200),
                    height: el.height || 80,
                    text: el.text,
                    points: el.points ? JSON.parse(el.points) : null,
                    src: el.imageUrl
                }));
                setElements(loadedElements);
            } else {
                // Если доска пустая, создаем приветственный элемент
                const welcomeElement = {
                    id: Date.now(),
                    type: "text",
                    text: "Добро пожаловать! Нажмите Rect или Text чтобы добавить элемент",
                    x: 100,
                    y: 100
                };
                setElements([welcomeElement]);
                await saveElements([welcomeElement]);
            }
        } catch (error) {
            console.error("Ошибка загрузки:", error);
        }
    };

    // Сохранение всех элементов
    const saveElements = async (els) => {
        try {
            setSaving(true);

            // Подготавливаем данные для отправки
            const elementsToSave = els.map(el => ({
                boardId: parseInt(id),
                type: el.type,
                x: Math.round(el.x),
                y: Math.round(el.y),
                width: el.width || null,
                height: el.height || null,
                text: el.text || null,
                points: el.points ? JSON.stringify(el.points) : null,
                imageUrl: el.src || null
            }));

            await api.post("/boarddata", {
                boardId: parseInt(id),
                elements: elementsToSave
            });

            // Показываем индикатор сохранения на 2 секунды
            setTimeout(() => setSaving(false), 2000);
        } catch (error) {
            console.error("Ошибка сохранения:", error);
            setSaving(false);
            alert("Ошибка сохранения!");
        }
    };

    // Автосохранение при изменении элементов
    const save = async (newElements) => {
        setElements(newElements);

        // Debounce сохранения
        if (saveTimeout) clearTimeout(saveTimeout);
        const timeout = setTimeout(() => {
            saveElements(newElements);
        }, 500);
        setSaveTimeout(timeout);
    };

    const addRect = () => {
        const newElement = {
            id: Date.now(),
            type: "rect",
            x: 100,
            y: 100,
            width: 120,
            height: 80
        };
        save([...elements, newElement]);
    };

    const addText = () => {
        const newElement = {
            id: Date.now(),
            type: "text",
            text: "Двойной клик чтобы редактировать",
            x: 150,
            y: 150
        };
        save([...elements, newElement]);
    };

    const handleTextDoubleClick = (el) => {
        const newText = prompt("Введите текст:", el.text);
        if (newText !== null) {
            const updatedElements = elements.map(e =>
                e.id === el.id ? { ...e, text: newText } : e
            );
            save(updatedElements);
        }
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
            const updatedElements = elements.map(el =>
                el.id === id ? { ...el, x: e.clientX - offsetX, y: e.clientY - offsetY } : el
            );
            setElements(updatedElements);

            // Debounced save during drag
            if (saveTimeout) clearTimeout(saveTimeout);
            const timeout = setTimeout(() => {
                saveElements(updatedElements);
            }, 300);
            setSaveTimeout(timeout);

            frame.current = null;
        });
    };

    const onMouseUp = () => {
        if (tool === "draw" && currentPath.length > 1) {
            const newPath = {
                id: Date.now(),
                type: "path",
                points: currentPath
            };
            save([...elements, newPath]);
            setCurrentPath([]);
        }
        if (dragRef.current) {
            dragRef.current = null;
        }
    };

    const onDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (!file || !file.type.startsWith("image")) return;

        const reader = new FileReader();
        reader.onload = () => {
            const rect = e.currentTarget.getBoundingClientRect();
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

    const deleteElement = (elId) => {
        if (window.confirm("Удалить элемент?")) {
            const newElements = elements.filter(el => el.id !== elId);
            save(newElements);
        }
    };

    return (
        <div className="container" style={{ padding: '20px 40px' }}>
            <div className="logo">EvaDeutche</div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2>MIRO Board #{id}</h2>
                <div>
                    <button onClick={() => navigate("/boards")} style={{ marginRight: 10 }}>
                        ← Мои доски
                    </button>
                    <button onClick={() => loadBoard()} style={{ background: '#48bb78' }}>
                        🔄 Обновить
                    </button>
                </div>
            </div>

            {saving && (
                <div style={{
                    position: 'fixed',
                    bottom: 20,
                    right: 20,
                    background: '#48bb78',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: 20,
                    fontSize: 12,
                    zIndex: 1000
                }}>
                    💾 Сохранено
                </div>
            )}

            <div className="canvas-container">
                <div className="canvas-toolbar">
                    <button onClick={() => setTool("select")} style={tool === "select" ? { opacity: 0.8, background: '#5a67d8' } : {}}>
                        🖱 Select
                    </button>
                    <button onClick={() => setTool("draw")} style={tool === "draw" ? { opacity: 0.8, background: '#5a67d8' } : {}}>
                        ✏️ Draw
                    </button>
                    <button onClick={addRect}>⬛ Rect</button>
                    <button onClick={addText}>📝 Text</button>
                    <span style={{ marginLeft: 'auto', fontSize: 12, color: '#718096' }}>
                        💡 Перетащите изображение | ⌫ Delete для удаления
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
                                    onDoubleClick={() => deleteElement(el.id)}
                                    className="canvas-element"
                                    style={{
                                        position: "absolute",
                                        left: el.x,
                                        top: el.y,
                                        width: el.width,
                                        height: el.height,
                                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                        border: "2px solid #fff",
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
                                    onDoubleClick={() => handleTextDoubleClick(el)}
                                    style={{
                                        position: "absolute",
                                        left: el.x,
                                        top: el.y,
                                        userSelect: "none",
                                        cursor: tool === "select" ? "move" : "default",
                                        fontSize: 16,
                                        background: "white",
                                        padding: "8px 12px",
                                        borderRadius: 8,
                                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                                        border: "1px solid #e2e8f0"
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
                                    onDoubleClick={() => deleteElement(el.id)}
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

            <div style={{ marginTop: 20, padding: 16, background: '#f7fafc', borderRadius: 12, fontSize: 14, color: '#718096' }}>
                💡 Советы:
                Двойной клик по тексту - редактирование |
                Двойной клик по фигуре/изображению - удаление |
                Автосохранение через 0.5 секунды после изменений
            </div>
        </div>
    );
}