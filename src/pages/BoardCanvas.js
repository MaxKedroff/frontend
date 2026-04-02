import { useEffect, useState, useRef } from "react";
import api from "../services/api";
import { useParams } from "react-router-dom";

export default function BoardCanvas() {
    const { id } = useParams();
    const [elements, setElements] = useState([]);
    const [tool, setTool] = useState("select");
    const [currentPath, setCurrentPath] = useState([]);
    const dragRef = useRef(null);
    const frame = useRef(null);

    // загрузка доски
    useEffect(() => {
        api.get(`/boarddata/${id}`).then(res => {
            if (res.data.length > 0)
                setElements(JSON.parse(res.data[0].data));
        });
    }, []);

    // сохранение
    const save = async (els) => {
        setElements(els);
        await api.post("/boarddata", {
            boardId: id,
            type: "json",
            data: JSON.stringify(els)
        });
    };

    // добавить прямоугольник
    const addRect = () => {
        save([
            ...elements,
            { id: Date.now(), type: "rect", x: 100, y: 100, width: 120, height: 80 }
        ]);
    };

    // добавить текст
    const addText = () => {
        save([
            ...elements,
            { id: Date.now(), type: "text", text: "Text", x: 150, y: 150 }
        ]);
    };

    // mouse events
    const onMouseDown = (e, el) => {
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
            if (currentPath.length > 0) setCurrentPath(prev => [...prev, [e.clientX, e.clientY]]);
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
        if (tool === "draw" && currentPath.length > 0) {
            save([...elements, { id: Date.now(), type: "path", points: currentPath }]);
            setCurrentPath([]);
        }
        if (dragRef.current) {
            save(elements);
            dragRef.current = null;
        }
    };

    // drag & drop изображений
    const onDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (!file || !file.type.startsWith("image")) return;

        const reader = new FileReader();
        reader.onload = () => {
            const newEl = { id: Date.now(), type: "image", src: reader.result, x: e.clientX, y: e.clientY, width: 200 };
            save([...elements, newEl]);
        };
        reader.readAsDataURL(file);
    };

    const onDragOver = (e) => e.preventDefault();

    return (
        <div>
            <h3>MIRO Board</h3>
            <div>
                <button onClick={() => setTool("select")}>Select</button>
                <button onClick={() => setTool("draw")}>Draw</button>
                <button onClick={addRect}>Rect</button>
                <button onClick={addText}>Text</button>
            </div>

            <div
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onDrop={onDrop}
                onDragOver={onDragOver}
                style={{ width: "100%", height: "600px", position: "relative", background: "#eee" }}
            >
                {elements.map(el => {
                    if (el.type === "rect") {
                        return (
                            <div
                                key={el.id}
                                onMouseDown={(e) => onMouseDown(e, el)}
                                style={{ position: "absolute", left: el.x, top: el.y, width: el.width, height: el.height, background: "white", border: "1px solid black", cursor: "move", userSelect: "none" }}
                            />
                        );
                    }
                    if (el.type === "text") {
                        return (
                            <div
                                key={el.id}
                                onMouseDown={(e) => onMouseDown(e, el)}
                                style={{ position: "absolute", left: el.x, top: el.y, userSelect: "none", cursor: "move" }}
                            >
                                {el.text}
                            </div>
                        );
                    }
                    if (el.type === "path") {
                        return (
                            <svg key={el.id} style={{ position: "absolute", left: 0, top: 0 }}>
                                <polyline points={el.points.map(p => p.join(",")).join(" ")} stroke="black" fill="none" />
                            </svg>
                        );
                    }
                    if (el.type === "image") {
                        return (
                            <img
                                key={el.id}
                                src={el.src}
                                onMouseDown={(e) => onMouseDown(e, el)}
                                style={{ position: "absolute", left: el.x, top: el.y, width: el.width, cursor: "move", userSelect: "none" }}
                            />
                        );
                    }
                    return null;
                })}
            </div>
        </div>
    );
}