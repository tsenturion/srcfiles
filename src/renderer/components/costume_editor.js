import React, { useRef, useEffect, useState } from 'react';
import paper from 'paper';
import { FormLabel, NumberInput, Box, Button, NumberInputField } from '@chakra-ui/react'

const CostumeEditor = ({ costume, onChangeCostume }) => {
    const canvasRef = useRef(null);
    const initialized = useRef(false);
    const savedViewState = useRef({ center: null, zoom: null });
    const initialViewState = useRef({ center: null, zoom: null });

    const [contextMenu, setContextMenu] = useState({
        visible: false,
        position: { x: 0, y: 0 },
        partId: '',
        portNumber: '',
        ledsCount: ''
    });

    const bodyPartsRef = useRef([]);
    const activeLEDRef = useRef(null);
    const offsetRef = useRef(null);

    const LED_LINE_WIDTH = 0.3;
    const LED_RADIUS = 2;

    // Serializes the costume data
    const serialize = (data) => {
        if (!data) return null;

        return data.map(part => ({
            name: part.dataId,
            port_number: part.portNumber,
            leds_count: part.leds.length,
            leds_positions: part.leds.map(led => ({ x: led.position.x - part.part.bounds.left, y: led.position.y  - part.part.bounds.top}))
        }));
    };

    // Clears the canvas of previous objects
    const clearCanvas = () => {
        bodyPartsRef.current.forEach(part => {
            part.leds.forEach(led => led.remove());
            part.lines.forEach(line => line.remove());
        });
    };

    // Updates the costume view
    const updateCostume = () => {
        clearCanvas();
        costume.forEach(partData => {
            const existingPart = bodyPartsRef.current.find(part => part.dataId === partData.name);
            if (existingPart) {
                existingPart.portNumber = partData.port_number;
                existingPart.portText.content = partData.port_number;
                const { leds, lines } = uploadLeds(existingPart, partData.leds_positions, partData.name);
                existingPart.leds = leds;
                existingPart.lines = lines;
            }
        });
    };

    // Distributes LEDs within a body part
    const distributeLEDs = (partData, count, dataId) => {
        const leds = [];
        const lines = [];
        const { part } = partData;

        // Calculates step size based on body part bounds
        const stepX = part.bounds.width / (count + 1);
        const stepY = part.bounds.height / (count + 1);

        // Removes previous LEDs and lines
        partData.leds.forEach(led => led.remove());
        partData.lines.forEach(line => line.remove());

        for (let i = 1; i <= count; i++) {
            const x = part.bounds.left + i * stepX;
            const y = part.bounds.top + i * stepY;

            const led = new paper.Path.Circle({
                center: new paper.Point(x, y),
                radius: LED_RADIUS,
                fillColor: 'yellow',
                data: { dataId, movable: true, index: i - 1 }
            });
            leds.push(led);

            if (i > 1) {
                const lastLED = leds[i - 2];
                const line = new paper.Path.Line({
                    from: lastLED.position,
                    to: led.position,
                    strokeColor: 'red',
                    strokeWidth: LED_LINE_WIDTH,
                    data: { dataId, start: i - 2, end: i - 1 }
                });
                lines.push(line);
            }
        }
        return { leds, lines };
    };

    // Updates LEDs in a body part
    const uploadLeds = (partData, positions, dataId) => {
        const leds = [];
        const lines = [];
        const { part } = partData;

        partData.leds.forEach(led => led.remove());
        partData.lines.forEach(line => line.remove());

        positions.forEach((position, index) => {
            const x = part.bounds.left + position.x;
            const y = part.bounds.top + position.y;

            const led = new paper.Path.Circle({
                center: new paper.Point(x, y),
                radius: LED_RADIUS,
                fillColor: 'yellow',
                data: { dataId, index, movable: true }
            });
            leds.push(led);

            if (index > 0) {
                const lastLED = leds[index - 1];
                const line = new paper.Path.Line({
                    from: lastLED.position,
                    to: led.position,
                    strokeColor: 'red',
                    strokeWidth: LED_LINE_WIDTH,
                    data: { dataId, start: index - 1, end: index }
                });
                lines.push(line);
            }
        });

        return { leds, lines };
    };

    // Updates a specific body part
    const updateBodyPart = (partId, updates) => {
        const partIndex = bodyPartsRef.current.findIndex(p => p.dataId === partId);
        if (partIndex !== -1) {
            bodyPartsRef.current[partIndex] = {
                ...bodyPartsRef.current[partIndex],
                ...updates
            };
        }
    };

    // Effect to initialize canvas and paper.js
    useEffect(() => {
        const canvas = canvasRef.current;

        if (!initialized.current) {
            paper.setup(canvas);
            initialized.current = true;
            initialViewState.current = {
                center: paper.view.center.clone(),
                zoom: paper.view.zoom
            };
            savedViewState.current = {
                center: paper.view.center.clone(),
                zoom: paper.view.zoom
            };
        }

        paper.project.clear();
        if (savedViewState.current.center && savedViewState.current.zoom) {
            paper.view.center = savedViewState.current.center;
            paper.view.zoom = savedViewState.current.zoom;
        }

        const centerX = initialViewState.current.center.x;
        const centerY = initialViewState.current.center.y;

        const drawGrid = (height, width) => {
            const gridColor = '#202020';
            const linesColor = '#343434';

            new paper.Path.Rectangle({
                from: [-width + centerX, -height + centerY],
                to: [width + centerX, height + centerY],
                fillColor: gridColor
            });

            for (let x = 0; x <= width * 2; x += 10) {
                new paper.Path.Line({
                    from: [x - width + centerX, -height + centerY],
                    to: [x - width + centerX, height + centerY],
                    strokeColor: linesColor,
                    strokeWidth: x % 50 === 0 ? 1 : 0.3
                });
            }
            for (let y = 0; y <= height * 2; y += 10) {
                new paper.Path.Line({
                    from: [0 - width + centerX, y - height + centerY],
                    to: [width + centerX, y - height + centerY],
                    strokeColor: linesColor,
                    strokeWidth: y % 50 === 0 ? 1 : 0.3
                });
            }
        };

        const createBodyPart = (dataId, center, size, fillColor, label, offset = 0) => {
            const part = new paper.Path.Rectangle({
                point: [center.x - size.width / 2 + offset, center.y - size.height / 2],
                size: [size.width, size.height],
                fillColor,
                strokeColor: 'black'
            });
            part.data.defaultFillColor = fillColor;
            part.data.dataId = dataId;

            const text = new paper.PointText({
                point: new paper.Point(part.bounds.center.x, part.bounds.center.y + size.height / 2 - 10),
                content: label,
                fillColor: 'black',
                justification: 'center',
                fontFamily: 'Arial',
                fontWeight: 'bold',
                fontSize: 12 / 3
            });

            const portText = new paper.PointText({
                point: [center.x + offset, center.y - size.height / 2 + 6],
                content: '1',
                fillColor: 'red',
                justification: 'center',
                fontFamily: 'Arial',
                fontWeight: 'bold',
                fontSize: 6
            });

            return { part, text, portText, dataId, leds: [], lines: [], portNumber: -1 };
        };

        drawGrid(1400, 1400);

        const bodyParts = ['front', 'back'].flatMap(side => {
            const offset = side === 'front' ? -100 : 100;
            return [
                createBodyPart(`head_${side}`, new paper.Point(centerX, centerY - 105), { width: 50, height: 50 }, '#ffd1dc', `Head\n${side}`, offset),
                createBodyPart(`body_${side}`, new paper.Point(centerX, centerY), { width: 100, height: 150 }, '#ffcccc', `Body\n${side}`, offset),
                createBodyPart(`left_hand_${side}`, new paper.Point(centerX - 75, centerY - 10), { width: 30, height: 130 }, '#ffebcc', `Left Arm\n${side}`, offset),
                createBodyPart(`right_hand_${side}`, new paper.Point(centerX + 75, centerY - 10), { width: 30, height: 130 }, '#ffebcc', `Right Arm\n${side}`, offset),
                createBodyPart(`left_leg_${side}`, new paper.Point(centerX - 30, centerY + 140), { width: 30, height: 120 }, '#ccebff', `Left Leg\n${side}`, offset),
                createBodyPart(`right_leg_${side}`, new paper.Point(centerX + 30, centerY + 140), { width: 30, height: 120 }, '#ccebff', `Right Leg\n${side}`, offset)
            ];
        });

        bodyPartsRef.current = bodyParts;

        const getCursorPosition = (event) => {
            const rect = canvas.getBoundingClientRect();
            const point = new paper.Point(event.clientX - rect.left, event.clientY - rect.top);
            return paper.view.viewToProject(point);
        };

        const changeZoom = (oldZoom, delta) => delta < 0 ? oldZoom * 0.95 : oldZoom / 0.95;

        const changeCenter = (oldCenter, deltaX, deltaY, factor) => oldCenter.add(new paper.Point(-deltaX, -deltaY).multiply(factor));

        const handleWheel = (event) => {
            event.preventDefault();
            if (!event.altKey) {
                paper.view.center = changeCenter(paper.view.center, event.deltaX, event.deltaY, 0.1);
            } else {
                paper.view.zoom = changeZoom(paper.view.zoom, event.deltaY);
            }
            savedViewState.current = { center: paper.view.center.clone(), zoom: paper.view.zoom };
        };

        const handleRightClick = (event) => {
            event.preventDefault();
            bodyPartsRef.current.forEach(part => part.part.fillColor = part.part.data.defaultFillColor);

            const cursor = getCursorPosition(event);
            const hitResult = paper.project.hitTest(cursor);
            if (hitResult?.item?.data?.dataId) {
                const selectedPart = bodyPartsRef.current.find(part => part.dataId === hitResult.item.data.dataId);
                hitResult.item.fillColor = '#AA0000';
                setContextMenu({
                    visible: true,
                    position: { x: event.clientX, y: event.clientY },
                    partId: selectedPart.dataId,
                    portNumber: selectedPart.portNumber,
                    ledsCount: selectedPart.leds.length
                });
            }
        };

        const handleMouseDown = (event) => {
            setContextMenu(prev => ({ ...prev, visible: false }));

            const cursor = getCursorPosition(event);
            const hitResult = paper.project.hitTest(cursor, { fill: true });
            if (hitResult?.item?.data?.movable) {
                activeLEDRef.current = hitResult.item;
                offsetRef.current = hitResult.item.position.subtract(cursor);
                canvasRef.current.style.cursor = 'move';
            }
        };

        const handleMouseMove = (event) => {
            if (activeLEDRef.current) {
              const cursor = getCursorPosition(event).add(offsetRef.current);

              const partData = bodyPartsRef.current.find(part => part.dataId === activeLEDRef.current.data.dataId);
              console.log(partData)
                if (partData) {
                    const { bounds } = partData.part;
                    activeLEDRef.current.position = new paper.Point(
                        Math.max(bounds.left, Math.min(cursor.x, bounds.right)),
                        Math.max(bounds.top, Math.min(cursor.y, bounds.bottom))
                    );

                    partData.lines.forEach(line => {
                        if (line.data.dataId !== activeLEDRef.current.data.dataId) return;

                        if (line.data.start === activeLEDRef.current.data.index) {
                            line.firstSegment.point = activeLEDRef.current.position;
                        }
                        if (line.data.end === activeLEDRef.current.data.index) {
                            line.lastSegment.point = activeLEDRef.current.position;
                        }
                    });
                    paper.view.draw();
                }
            }
        };

        const handleMouseUp = () => {
            if (activeLEDRef.current) {
                activeLEDRef.current = null;
                canvasRef.current.style.cursor = 'default';
                onChangeCostume(serialize(bodyPartsRef.current));
                paper.view.draw();
            }
        };

        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('wheel', handleWheel);
        canvas.addEventListener('contextmenu', handleRightClick);

        updateCostume();

        return () => {
            canvas.removeEventListener('mousedown', handleMouseDown);
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('mouseup', handleMouseUp);
            canvas.removeEventListener('wheel', handleWheel);
            canvas.removeEventListener('contextmenu', handleRightClick);
            paper.project.clear();
        };
    }, [costume]);

    const handleMenuSubmit = (event) => {
        event.preventDefault();
        const count = parseInt(contextMenu.ledsCount, 10);
        if (contextMenu.partId && count) {
            const part = bodyPartsRef.current.find(p => p.dataId === contextMenu.partId);
            part.portNumber = contextMenu.portNumber;
            part.portText.content = part.portNumber.toString();

            if (part) {
                const { leds, lines } = distributeLEDs(part, count, part.dataId);
                updateBodyPart(contextMenu.partId, { portNumber: part.portNumber, ledsCount: count, leds, lines });
                onChangeCostume(serialize(bodyPartsRef.current));
            }
        }
        setContextMenu(prev => ({ ...prev, visible: false }));
    };

    return (
        <div>
            <canvas ref={canvasRef} id="costumeCanvas" style={{ margin: "0 auto", width: '1000px', height: '600px' }}></canvas>
            {contextMenu.visible && (
                <div style={{
                    position: 'absolute',
                    top: contextMenu.position.y,
                    left: contextMenu.position.x,
                    borderRadius: "10px",
                    background: 'white',
                    opacity: 0.95,
                    border: '1px solid black',
                    padding: '10px'
                }}>
                    <form onSubmit={handleMenuSubmit}>
                        <Box display="flex" m={2}>
                            <FormLabel>
                                Leds Count:
                            </FormLabel>
                            <NumberInput variant="filled" defaultValue={contextMenu.ledsCount}>
                                <NumberInputField
                                    value={contextMenu.ledsCount}
                                    onChange={(e) => setContextMenu(prev => ({ ...prev, ledsCount: e.target.value }))} />
                            </NumberInput>
                        </Box>

                        <Box display="flex" >
                            <FormLabel>
                                Port Number:
                            </FormLabel>

                            <NumberInput variant="filled" defaultValue={contextMenu.portNumber}>
                                <NumberInputField value={contextMenu.portNumber}
                                    onChange={(e) => setContextMenu(prev => ({ ...prev, portNumber: e.target.value }))} />
                            </NumberInput>
                        </Box>
                        <Button style={{right:0}} m={2} colorScheme="blue" variant='outline' type="submit">Add LEDs</Button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default CostumeEditor;
