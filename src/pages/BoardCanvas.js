import { useEffect, useState, useRef, useCallback } from "react";
import api from "../services/api";
import { useParams, useNavigate } from "react-router-dom";

export default function BoardCanvas() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [elements, setElements] = useState([]);
    const [tool, setTool] = useState("select");
    const [currentPath, setCurrentPath] = useState([]);
    const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [selectedElement, setSelectedElement] = useState(null);
    const [resizing, setResizing] = useState(null);
    const [editingText, setEditingText] = useState(null);
    const [editingValue, setEditingValue] = useState("");

    const dragRef = useRef(null);
    const frame = useRef(null);
    const [saving, setSaving] = useState(false);
    const [saveTimeout, setSaveTimeout] = useState(null);
    const canvasRef = useRef(null);
    const textareaRef = useRef(null);

    // Загрузка доски
    useEffect(() => {
        loadBoard();
    }, [id]);

    // Фокус на текстовое поле при редактировании
    useEffect(() => {
        if (editingText && textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.select();
        }
    }, [editingText]);

    const loadBoard = async () => {
        try {
            const res = await api.get(`/boarddata/${id}`);
            if (res.data && res.data.length > 0) {
                const loadedElements = res.data.map(el => ({
                    id: el.id,
                    type: el.type,
                    x: el.x || 0,
                    y: el.y || 0,
                    width: el.width || (el.type === "rect" ? 120 : (el.type === "image" ? 200 : null)),
                    height: el.height || (el.type === "rect" ? 80 : (el.type === "image" ? 150 : null)),
                    text: el.text || null,
                    points: el.points ? JSON.parse(el.points) : null,
                    src: el.imageUrl || null,
                    fontSize: el.fontSize || 16
                }));
                setElements(loadedElements);
            } else {
                const welcomeElement = {
                    id: Date.now(),
                    type: "text",
                    text: "Добро пожаловать! Дважды кликните чтобы редактировать текст",
                    x: 100,
                    y: 100,
                    fontSize: 16
                };
                setElements([welcomeElement]);
                await saveElements([welcomeElement]);
            }
        } catch (error) {
            console.error("Ошибка загрузки:", error);
        }
    };

    const saveElements = async (els) => {
        try {
            setSaving(true);
            const elementsToSave = els.map(el => ({
                boardId: parseInt(id),
                type: el.type,
                x: Math.round(el.x || 0),
                y: Math.round(el.y || 0),
                width: el.width ? Math.round(el.width) : null,
                height: el.height ? Math.round(el.height) : null,
                text: el.text || null,
                points: el.points ? JSON.stringify(el.points) : null,
                imageUrl: el.src || null,
                fontSize: el.fontSize || null
            }));

            await api.post("/boarddata", {
                boardId: parseInt(id),
                elements: elementsToSave
            });

            setTimeout(() => setSaving(false), 2000);
        } catch (error) {
            console.error("Ошибка сохранения:", error);
            setSaving(false);
            alert("Ошибка сохранения: " + (error.response?.data?.title || error.message));
        }
    };

    const save = useCallback(async (newElements) => {
        setElements(newElements);
        if (saveTimeout) clearTimeout(saveTimeout);
        const timeout = setTimeout(() => {
            saveElements(newElements);
        }, 500);
        setSaveTimeout(timeout);
    }, [id]);

    // Панорамирование
    const onMouseDownCanvas = (e) => {
        if (tool === "hand" || (tool === "select" && e.button === 1)) {
            setIsPanning(true);
            setPanStart({ x: e.clientX - canvasOffset.x, y: e.clientY - canvasOffset.y });
            e.preventDefault();
        }
    };

    const onMouseMoveCanvas = (e) => {
        if (isPanning) {
            setCanvasOffset({
                x: e.clientX - panStart.x,
                y: e.clientY - panStart.y
            });
        }
    };

    const onMouseUpCanvas = () => {
        setIsPanning(false);
    };

    // Зум колесиком
    const onWheel = (e) => {
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.min(Math.max(zoom * delta, 0.2), 3);
        setZoom(newZoom);
        e.preventDefault();
    };

    // Добавление элементов
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
            text: "Новый текст",
            x: 150,
            y: 150,
            fontSize: 16
        };
        save([...elements, newElement]);
    };

    // Обработка редактирования текста
    const startEditing = (el, e) => {
        e.stopPropagation();
        setEditingText(el.id);
        setEditingValue(el.text);
    };

    const finishEditing = () => {
        if (editingText) {
            const updatedElements = elements.map(el =>
                el.id === editingText ? { ...el, text: editingValue } : el
            );
            save(updatedElements);
            setEditingText(null);
            setEditingValue("");
        }
    };

    const handleTextKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            finishEditing();
        } else if (e.key === 'Escape') {
            setEditingText(null);
            setEditingValue("");
        }
    };

    // Ресайз для всех типов элементов
    const startResize = (e, el, direction) => {
        e.stopPropagation();
        e.preventDefault();
        setResizing({
            id: el.id,
            direction,
            startX: e.clientX,
            startY: e.clientY,
            startWidth: el.width || 100,
            startHeight: el.height || 100,
            startXPos: el.x,
            startYPos: el.y
        });
    };

    const onMouseMoveResize = (e) => {
        if (!resizing) return;

        const deltaX = (e.clientX - resizing.startX) / zoom;
        const deltaY = (e.clientY - resizing.startY) / zoom;

        let newWidth = resizing.startWidth;
        let newHeight = resizing.startHeight;
        let newX = resizing.startXPos;
        let newY = resizing.startYPos;

        switch (resizing.direction) {
            case 'se':
                newWidth = Math.max(30, resizing.startWidth + deltaX);
                newHeight = Math.max(30, resizing.startHeight + deltaY);
                break;
            case 'e':
                newWidth = Math.max(30, resizing.startWidth + deltaX);
                break;
            case 's':
                newHeight = Math.max(30, resizing.startHeight + deltaY);
                break;
            case 'ne':
                newWidth = Math.max(30, resizing.startWidth + deltaX);
                newHeight = Math.max(30, resizing.startHeight - deltaY);
                newY = resizing.startYPos + deltaY;
                break;
            case 'nw':
                newWidth = Math.max(30, resizing.startWidth - deltaX);
                newHeight = Math.max(30, resizing.startHeight - deltaY);
                newX = resizing.startXPos + deltaX;
                newY = resizing.startYPos + deltaY;
                break;
            case 'sw':
                newWidth = Math.max(30, resizing.startWidth - deltaX);
                newHeight = Math.max(30, resizing.startHeight + deltaY);
                newX = resizing.startXPos + deltaX;
                break;
            case 'n':
                newHeight = Math.max(30, resizing.startHeight - deltaY);
                newY = resizing.startYPos + deltaY;
                break;
            case 'w':
                newWidth = Math.max(30, resizing.startWidth - deltaX);
                newX = resizing.startXPos + deltaX;
                break;
        }

        const updatedElements = elements.map(el =>
            el.id === resizing.id ? { ...el, width: Math.round(newWidth), height: Math.round(newHeight), x: Math.round(newX), y: Math.round(newY) } : el
        );
        setElements(updatedElements);
    };

    const stopResize = () => {
        if (resizing) {
            save(elements);
            setResizing(null);
        }
    };

    // Перетаскивание
    const onMouseDown = (e, el) => {
        if (tool !== "select" || resizing || editingText) return;
        e.stopPropagation();
        setSelectedElement(el.id);
        dragRef.current = {
            id: el.id,
            offsetX: (e.clientX - canvasOffset.x) / zoom - el.x,
            offsetY: (e.clientY - canvasOffset.y) / zoom - el.y
        };
    };

    const onMouseMove = (e) => {
        if (resizing) {
            onMouseMoveResize(e);
            return;
        }

        if (!dragRef.current) return;
        if (frame.current) return;

        frame.current = requestAnimationFrame(() => {
            const { id, offsetX, offsetY } = dragRef.current;
            const newX = (e.clientX - canvasOffset.x) / zoom - offsetX;
            const newY = (e.clientY - canvasOffset.y) / zoom - offsetY;

            const updatedElements = elements.map(el =>
                el.id === id ? { ...el, x: Math.round(newX), y: Math.round(newY) } : el
            );
            setElements(updatedElements);

            if (saveTimeout) clearTimeout(saveTimeout);
            const timeout = setTimeout(() => {
                saveElements(updatedElements);
            }, 300);
            setSaveTimeout(timeout);

            frame.current = null;
        });
    };

    const onMouseUp = () => {
        if (dragRef.current) {
            save(elements);
            dragRef.current = null;
        }
        if (resizing) {
            stopResize();
        }
    };

    // Рисование
    const onMouseDownDraw = (e) => {
        if (tool !== "draw") return;
        const rect = canvasRef.current.getBoundingClientRect();
        setCurrentPath([{
            x: (e.clientX - rect.left - canvasOffset.x) / zoom,
            y: (e.clientY - rect.top - canvasOffset.y) / zoom
        }]);
    };

    const onMouseMoveDraw = (e) => {
        if (tool !== "draw" || currentPath.length === 0) return;
        const rect = canvasRef.current.getBoundingClientRect();
        setCurrentPath(prev => [...prev, {
            x: (e.clientX - rect.left - canvasOffset.x) / zoom,
            y: (e.clientY - rect.top - canvasOffset.y) / zoom
        }]);
    };

    const onMouseUpDraw = () => {
        if (tool === "draw" && currentPath.length > 1) {
            const newPath = {
                id: Date.now(),
                type: "path",
                points: currentPath
            };
            save([...elements, newPath]);
            setCurrentPath([]);
        } else {
            setCurrentPath([]);
        }
    };

    // Drag & drop изображений
    const onDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (!file || !file.type.startsWith("image")) return;

        const reader = new FileReader();
        reader.onload = () => {
            const rect = canvasRef.current.getBoundingClientRect();
            const newEl = {
                id: Date.now(),
                type: "image",
                src: reader.result,
                x: (e.clientX - rect.left - canvasOffset.x) / zoom,
                y: (e.clientY - rect.top - canvasOffset.y) / zoom,
                width: 200,
                height: 150
            };
            save([...elements, newEl]);
        };
        reader.readAsDataURL(file);
    };

    const onDragOver = (e) => e.preventDefault();

    // Удаление элемента
    const deleteElement = (elId) => {
        if (window.confirm("Удалить элемент?")) {
            const newElements = elements.filter(el => el.id !== elId);
            save(newElements);
            setSelectedElement(null);
        }
    };

    // Ресайз хэндлеры для любого выбранного элемента
    const ResizeHandles = ({ element }) => {
        if (selectedElement !== element.id || tool !== "select") return null;
        // Показываем для прямоугольников, изображений и текста
        if (!['rect', 'image', 'text'].includes(element.type)) return null;

        const handleSize = 10;
        const width = element.width || (element.type === 'text' ? 200 : 100);
        const height = element.height || (element.type === 'text' ? 60 : 100);

        return (
            <div>
                {/* Углы */}
                <div
                    onMouseDown={(e) => startResize(e, element, 'nw')}
                    style={{
                        position: 'absolute',
                        left: -handleSize / 2,
                        top: -handleSize / 2,
                        width: handleSize,
                        height: handleSize,
                        background: 'white',
                        border: '2px solid #667eea',
                        borderRadius: '50%',
                        cursor: 'nw-resize',
                        zIndex: 20,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }}
                />
                <div
                    onMouseDown={(e) => startResize(e, element, 'ne')}
                    style={{
                        position: 'absolute',
                        right: -handleSize / 2,
                        top: -handleSize / 2,
                        width: handleSize,
                        height: handleSize,
                        background: 'white',
                        border: '2px solid #667eea',
                        borderRadius: '50%',
                        cursor: 'ne-resize',
                        zIndex: 20,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }}
                />
                <div
                    onMouseDown={(e) => startResize(e, element, 'sw')}
                    style={{
                        position: 'absolute',
                        left: -handleSize / 2,
                        bottom: -handleSize / 2,
                        width: handleSize,
                        height: handleSize,
                        background: 'white',
                        border: '2px solid #667eea',
                        borderRadius: '50%',
                        cursor: 'sw-resize',
                        zIndex: 20,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }}
                />
                <div
                    onMouseDown={(e) => startResize(e, element, 'se')}
                    style={{
                        position: 'absolute',
                        right: -handleSize / 2,
                        bottom: -handleSize / 2,
                        width: handleSize,
                        height: handleSize,
                        background: 'white',
                        border: '2px solid #667eea',
                        borderRadius: '50%',
                        cursor: 'se-resize',
                        zIndex: 20,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }}
                />
                {/* Стороны */}
                <div
                    onMouseDown={(e) => startResize(e, element, 'n')}
                    style={{
                        position: 'absolute',
                        top: -handleSize / 2,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: handleSize,
                        height: handleSize,
                        background: 'white',
                        border: '2px solid #667eea',
                        borderRadius: '50%',
                        cursor: 'n-resize',
                        zIndex: 20,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }}
                />
                <div
                    onMouseDown={(e) => startResize(e, element, 's')}
                    style={{
                        position: 'absolute',
                        bottom: -handleSize / 2,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: handleSize,
                        height: handleSize,
                        background: 'white',
                        border: '2px solid #667eea',
                        borderRadius: '50%',
                        cursor: 's-resize',
                        zIndex: 20,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }}
                />
                <div
                    onMouseDown={(e) => startResize(e, element, 'w')}
                    style={{
                        position: 'absolute',
                        left: -handleSize / 2,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: handleSize,
                        height: handleSize,
                        background: 'white',
                        border: '2px solid #667eea',
                        borderRadius: '50%',
                        cursor: 'w-resize',
                        zIndex: 20,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }}
                />
                <div
                    onMouseDown={(e) => startResize(e, element, 'e')}
                    style={{
                        position: 'absolute',
                        right: -handleSize / 2,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: handleSize,
                        height: handleSize,
                        background: 'white',
                        border: '2px solid #667eea',
                        borderRadius: '50%',
                        cursor: 'e-resize',
                        zIndex: 20,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }}
                />
            </div>
        );
    };

    // Определение границ элемента для отображения рамки
    const getElementBounds = (el) => {
        if (el.type === 'text') {
            return {
                width: el.width || 200,
                height: el.height || 60
            };
        }
        return {
            width: el.width || 100,
            height: el.height || 100
        };
    };

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="logo">EvaDeutche</div>

            {/* Toolbar */}
            <div style={{ background: 'white', padding: '12px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', zIndex: 10 }}>
                <div style={{ display: 'flex', gap: 8, background: '#f7fafc', padding: '4px', borderRadius: 12 }}>
                    <button onClick={() => setTool("select")} style={{ background: tool === "select" ? '#667eea' : '#e2e8f0', color: tool === "select" ? 'white' : '#4a5568' }}>
                        🖱 Select
                    </button>
                    <button onClick={() => setTool("hand")} style={{ background: tool === "hand" ? '#667eea' : '#e2e8f0', color: tool === "hand" ? 'white' : '#4a5568' }}>
                        ✋ Hand
                    </button>
                    <button onClick={() => setTool("draw")} style={{ background: tool === "draw" ? '#667eea' : '#e2e8f0', color: tool === "draw" ? 'white' : '#4a5568' }}>
                        ✏️ Draw
                    </button>
                </div>

                <div style={{ width: 1, height: 30, background: '#e2e8f0' }} />

                <button onClick={addRect}>⬛ Rect</button>
                <button onClick={addText}>📝 Text</button>

                {selectedElement && (
                    <button onClick={() => deleteElement(selectedElement)} style={{ background: '#ef4444' }}>
                        🗑 Удалить
                    </button>
                )}

                <div style={{ flex: 1 }} />

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#718096' }}>Zoom: {Math.round(zoom * 100)}%</span>
                    <button onClick={() => setZoom(1)} style={{ padding: '6px 12px' }}>Reset</button>
                    <button onClick={() => navigate("/boards")} style={{ background: '#718096' }}>← Выход</button>
                </div>
            </div>

            {/* Canvas */}
            <div
                style={{ flex: 1, overflow: 'hidden', position: 'relative', background: '#f1f5f9', cursor: tool === 'hand' || (tool === 'select' && isPanning) ? 'grab' : 'default' }}
                onMouseDown={onMouseDownCanvas}
                onMouseMove={onMouseMoveCanvas}
                onMouseUp={onMouseUpCanvas}
                onWheel={onWheel}
            >
                <div
                    ref={canvasRef}
                    onMouseMove={tool === "draw" ? onMouseMoveDraw : onMouseMove}
                    onMouseUp={tool === "draw" ? onMouseUpDraw : onMouseUp}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    style={{
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                        transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${zoom})`,
                        transformOrigin: '0 0',
                        backgroundImage: 'radial-gradient(circle, #cbd5e0 1px, transparent 1px)',
                        backgroundSize: '20px 20px'
                    }}
                >
                    {elements.map(el => {
                        if (el.type === "rect") {
                            return (
                                <div key={el.id}>
                                    <div
                                        onMouseDown={(e) => onMouseDown(e, el)}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedElement(el.id);
                                        }}
                                        style={{
                                            position: "absolute",
                                            left: el.x,
                                            top: el.y,
                                            width: el.width,
                                            height: el.height,
                                            background: selectedElement === el.id ? 'rgba(102, 126, 234, 0.15)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                            border: selectedElement === el.id ? '3px solid #667eea' : '2px solid #fff',
                                            borderRadius: 8,
                                            cursor: tool === "select" ? "move" : "default",
                                            userSelect: "none",
                                            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                                            transition: 'border 0.1s ease'
                                        }}
                                    />
                                    <ResizeHandles element={el} />
                                </div>
                            );
                        }

                        if (el.type === "text") {
                            const bounds = getElementBounds(el);
                            if (editingText === el.id) {
                                return (
                                    <textarea
                                        key={el.id}
                                        ref={textareaRef}
                                        value={editingValue}
                                        onChange={(e) => setEditingValue(e.target.value)}
                                        onBlur={finishEditing}
                                        onKeyDown={handleTextKeyDown}
                                        style={{
                                            position: "absolute",
                                            left: el.x,
                                            top: el.y,
                                            fontSize: el.fontSize,
                                            background: "white",
                                            border: "2px solid #667eea",
                                            borderRadius: 8,
                                            padding: "8px",
                                            minWidth: bounds.width,
                                            minHeight: bounds.height,
                                            fontFamily: 'inherit',
                                            outline: 'none',
                                            resize: 'both',
                                            zIndex: 100,
                                            boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                                        }}
                                        autoFocus
                                    />
                                );
                            }

                            return (
                                <div key={el.id}>
                                    <div
                                        onMouseDown={(e) => onMouseDown(e, el)}
                                        onDoubleClick={(e) => startEditing(el, e)}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedElement(el.id);
                                        }}
                                        style={{
                                            position: "absolute",
                                            left: el.x,
                                            top: el.y,
                                            userSelect: "none",
                                            cursor: tool === "select" ? "move" : "default",
                                            fontSize: el.fontSize,
                                            background: selectedElement === el.id ? 'rgba(102, 126, 234, 0.1)' : 'white',
                                            padding: "8px 12px",
                                            borderRadius: 8,
                                            boxShadow: selectedElement === el.id ? '0 0 0 2px #667eea' : '0 2px 8px rgba(0,0,0,0.1)',
                                            border: "1px solid #e2e8f0",
                                            minWidth: bounds.width,
                                            minHeight: bounds.height,
                                            whiteSpace: 'pre-wrap',
                                            transition: 'all 0.1s ease'
                                        }}
                                    >
                                        {el.text}
                                    </div>
                                    <ResizeHandles element={el} />
                                </div>
                            );
                        }

                        if (el.type === "path") {
                            const points = el.points.map(p => `${p.x},${p.y}`).join(" ");
                            return (
                                <svg key={el.id} style={{ position: "absolute", left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                                    <polyline
                                        points={points}
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
                                <div key={el.id}>
                                    <img
                                        src={el.src}
                                        alt=""
                                        onMouseDown={(e) => onMouseDown(e, el)}
                                        onDoubleClick={() => deleteElement(el.id)}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedElement(el.id);
                                        }}
                                        style={{
                                            position: "absolute",
                                            left: el.x,
                                            top: el.y,
                                            width: el.width,
                                            height: el.height,
                                            cursor: tool === "select" ? "move" : "default",
                                            userSelect: "none",
                                            borderRadius: 8,
                                            boxShadow: selectedElement === el.id ? '0 0 0 3px #667eea' : '0 2px 8px rgba(0,0,0,0.1)'
                                        }}
                                    />
                                    <ResizeHandles element={el} />
                                </div>
                            );
                        }
                        return null;
                    })}

                    {/* Drawing preview */}
                    {tool === "draw" && currentPath.length > 0 && (
                        <svg style={{ position: "absolute", left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                            <polyline
                                points={currentPath.map(p => `${p.x},${p.y}`).join(" ")}
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

            {/* Status bar */}
            <div style={{ background: 'white', padding: '8px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#718096' }}>
                <div>
                    🖱 {tool === "select" && "Выберите и перемещайте элементы | Двойной клик по тексту для редактирования"}
                    {tool === "hand" && "Перетаскивайте для панорамирования"}
                    {tool === "draw" && "Рисуйте линии"}
                </div>
                <div>
                    {saving && "💾 Сохранено!"}
                    {!saving && `📦 ${elements.length} элементов | 🔍 ${Math.round(zoom * 100)}%`}
                </div>
                <div>
                    💡 Советы: Кликните на элемент чтобы увидеть углы для ресайза | Двойной клик по тексту | Delete для удаления
                </div>
            </div>
        </div>
    );
}