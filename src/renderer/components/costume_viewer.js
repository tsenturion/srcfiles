import React, { useRef, useEffect, useState } from 'react'
import paper from 'paper'

const CostumeViewer = ({ costume, selection, onChangeSelection, pattern, currentTime }) => {
  const canvasRef = useRef(null)
  const initialized = useRef(false)
  const savedViewState = useRef({ center: null, zoom: null })
  const initialViewState = useRef({ center: null, zoom: null })
  const [selectionRectangle, setSelectionRectangle] = useState(null)

  const bodyPartsRef = useRef([])

  const LED_RADIUS = 3

  // Serializes the costume data
  const serialize = data => {
    if (!data) return null
    return data.map(part => ({
      name: part.dataId,
      port_number: part.portNumber,
      leds_count: part.leds.length,
      leds_positions: part.leds.map(led => ({
        x: led.position.x,
        y: led.position.y
      }))
    }))
  }

  // Clears the canvas of previous objects
  const clearCanvas = () => {
    bodyPartsRef.current.forEach(part => {
      part.leds.forEach(led => {
          led.data.ledIdText?.remove()
        led.remove()
      })
    })
  }

  // Updates LEDs in a body part
  const updateLEDs = (partData, positions, dataId) => {
    const leds = []
    const { part } = partData

    partData.leds.forEach(led => {led.data.ledIdText?.remove();led.remove();})

    positions.forEach((position, index) => {
      const x = part.bounds.left + position.x
      const y = part.bounds.top + position.y
      const id = `${dataId}_${index}`
      let ledIdText = null;
      if (selection.includes(id)) {
        ledIdText = new paper.PointText({
          point: new paper.Point(x, y + LED_RADIUS*3),
          content: index,
          fillColor: 'lightgrey',
          justification: 'center',
          fontFamily: 'Arial',
          fontWeight: 'bold',
          fontSize: 6}
        )
      }
      const led = new paper.Path.Circle({
        center: new paper.Point(x, y),
        radius: LED_RADIUS,
        fillColor: selection.includes(id) ? 'blue' : 'yellow',
        data: { dataId, ledIdText, index, movable: false }
      })
      leds.push(led)
    })

    return { leds }
  }

  // Updates the costume view
  const updateCostume = () => {
    clearCanvas()
    costume.forEach(partData => {
      const existingPart = bodyPartsRef.current.find(
        part => part.dataId === partData.name
      )
      if (existingPart) {
        existingPart.portNumber = partData.port_number
        existingPart.portText.content = partData.port_number
        const { leds } = updateLEDs(
          existingPart,
          partData.leds_positions,
          partData.name
        )
        existingPart.leds = leds
      }
    })
  }

  const handleClickLED = (event, ledData) => {
    const id = `${ledData.dataId}_${ledData.index}`
    let c = selection.length > 0 ? Array.from(selection) : [id]
    if (event.ctrlKey || event.metaKey) {
      if (c.includes(id)) {
        c = c.filter(e => e != id)
      } else {
        c.push(id)
      }
    } else {
      if (selection.length == 1 && selection[0] == id) {
        c = []
      } else {
        c = [id]
      }
    }
    onChangeSelection(Array.from(c))
  }

  const getCursorPosition = event => {
    const rect = canvasRef.current.getBoundingClientRect()
    const point = new paper.Point(
      event.clientX - rect.left,
      event.clientY - rect.top
    )
    return paper.view.viewToProject(point)
  }

  useEffect(() => {
    bodyPartsRef.current.forEach(bp=>{
      bp.leds.forEach(led=>{
        led.fillColor = "#000000";
        pattern.seqs.forEach(seq=>{
          if (seq.leds.includes(`${led.data.dataId}_${led.data.index}`)) {
            seq.sequence.forEach(seqseq=>{
              if (currentTime > seqseq.start && currentTime < seqseq.end) {
                led.fillColor = seqseq.color;
              }
            })
          }
        })
      })
    })
  }, [pattern, currentTime, costume])

  // Effect to initialize canvas and paper.js
  useEffect(() => {
    const canvas = canvasRef.current

    if (!initialized.current) {
      paper.setup(canvas)
      initialized.current = true
      initialViewState.current = {
        center: paper.view.center.clone(),
        zoom: paper.view.zoom
      }
      savedViewState.current = {
        center: paper.view.center.clone(),
        zoom: paper.view.zoom
      }
    }

    paper.project.clear()
    if (savedViewState.current.center && savedViewState.current.zoom) {
      paper.view.center = savedViewState.current.center
      paper.view.zoom = savedViewState.current.zoom
    }

    const centerX = initialViewState.current.center.x
    const centerY = initialViewState.current.center.y

    const drawGrid = (height, width) => {
      const gridColor = '#202020'
      const linesColor = '#343434'

      new paper.Path.Rectangle({
        from: [-width + centerX, -height + centerY],
        to: [width + centerX, height + centerY],
        fillColor: gridColor
      })

      for (let x = 0; x <= width * 2; x += 10) {
        new paper.Path.Line({
          from: [x - width + centerX, -height + centerY],
          to: [x - width + centerX, height + centerY],
          strokeColor: linesColor,
          strokeWidth: x % 50 === 0 ? 1 : 0.3
        })
      }
      for (let y = 0; y <= height * 2; y += 10) {
        new paper.Path.Line({
          from: [0 - width + centerX, y - height + centerY],
          to: [width + centerX, y - height + centerY],
          strokeColor: linesColor,
          strokeWidth: y % 50 === 0 ? 1 : 0.3
        })
      }
    }

    const createBodyPart = (dataId, center, size, fillColor, offset = 0) => {
      const part = new paper.Path.Rectangle({
        point: new paper.Point(
          center.x - size.width / 2 + offset,
          center.y - size.height / 2
        ),
        size: [size.width, size.height],
        fillColor,
        strokeColor: 'black'
      })
      part.data.defaultFillColor = fillColor
      part.data.dataId = dataId

      const portText = new paper.PointText({
        point: [center.x + offset, center.y - size.height / 2 + 6],
        content: '1',
        fillColor: 'red',
        justification: 'center',
        fontFamily: 'Arial',
        fontWeight: 'bold',
        fontSize: 6
      })

      return { part, portText, dataId, leds: [], lines: [], portNumber: -1 }
    }

    drawGrid(1400, 1400)

    const bodyParts = ['front', 'back'].flatMap(side => {
      const offset = side === 'front' ? -100 : 100
      return [
        createBodyPart(
          `head_${side}`,
          new paper.Point(centerX, centerY - 105),
          { width: 50, height: 50 },
          'grey',
          offset
        ),
        createBodyPart(
          `body_${side}`,
          new paper.Point(centerX, centerY),
          { width: 100, height: 150 },
          'grey',
          offset
        ),
        createBodyPart(
          `left_hand_${side}`,
          new paper.Point(centerX - 75, centerY - 10),
          { width: 30, height: 130 },
          'grey',
          offset
        ),
        createBodyPart(
          `right_hand_${side}`,
          new paper.Point(centerX + 75, centerY - 10),
          { width: 30, height: 130 },
          'grey',
          offset
        ),
        createBodyPart(
          `left_leg_${side}`,
          new paper.Point(centerX - 30, centerY + 140),
          { width: 30, height: 120 },
          'grey',
          offset
        ),
        createBodyPart(
          `right_leg_${side}`,
          new paper.Point(centerX + 30, centerY + 140),
          { width: 30, height: 120 },
          'grey',
          offset
        )
      ]
    })

    bodyPartsRef.current = bodyParts

    const changeZoom = (oldZoom, delta) =>
      delta < 0 ? oldZoom * 0.95 : oldZoom / 0.95

    const changeCenter = (oldCenter, deltaX, deltaY, factor) =>
      oldCenter.add(new paper.Point(-deltaX, -deltaY).multiply(factor))

    const handleWheel = event => {
      event.preventDefault()
      if (!event.altKey) {
        paper.view.center = changeCenter(
          paper.view.center,
          event.deltaX,
          event.deltaY,
          0.1
        )
      } else {
        paper.view.zoom = changeZoom(paper.view.zoom, event.deltaY)
      }
      savedViewState.current = {
        center: paper.view.center.clone(),
        zoom: paper.view.zoom
      }
    }

    canvas.addEventListener('wheel', handleWheel)

    const handleMouseDown = event => {
      // offsetRef.current = hitResult.item.position.subtract(cursor);
      // const startPoint = paper.view.viewToProject(new paper.Point(event.clientX, event.clientY));
      const rect = new paper.Path.Rectangle({
        point: cursor,
        size: new paper.Size(0.2, 0.2),
        strokeColor: 'blue',
        strokeWidth: 1,
        dashArray: [5, 5]
      })

      // const isCtrlKey = event.ctrlKey || event.metaKey;

      // // Track the current selection rectangle
      setSelectionRectangle(rect)
    }

    let tool = new paper.Tool()
    let rectanglePath // Переменная для хранения рисуемого прямоугольника
    let startPoint // Точка начала рисования
    let prevSelection = [];

    tool.onMouseDown = event => {
      console.log('StartPoint', event.point)
      // Запоминаем начальную точку
      if (event.event.altKey) {
        startPoint = event.point
        prevSelection = selection
      }
      // Создаем новый прямоугольник при каждом нажатии мыши
    }

    tool.onMouseUp = event => {
      rectanglePath?.remove()
      startPoint = null
      paper.view.draw()
    }

    tool.onMouseDrag = event => {
      if (!startPoint) {
        return
      }
      // console.log('Selection start', event.point)
      // При перемещении мыши изменяем размеры прямоугольника
      const rectTopLeft = new paper.Point(
        Math.min(startPoint.x, event.point.x),
        Math.min(startPoint.y, event.point.y)
      )
      const rectSize = new paper.Size(
        Math.abs(event.point.x - startPoint.x),
        Math.abs(event.point.y - startPoint.y)
      )
      let goodLeds = []

      bodyPartsRef.current.forEach(bp => {
        bp.leds.forEach(led => {
          if (
            led.position.x >= rectTopLeft.x &&
            led.position.x <= rectTopLeft.x + rectSize.width &&
            led.position.y >= rectTopLeft.y &&
            led.position.y <= rectTopLeft.y + rectSize.height
          ) {
            goodLeds.push(`${bp.dataId}_${led.data.index}`)
          }
        })
      })
      if (event.event.metaKey || event.event.ctrlKey) {
        goodLeds = prevSelection.concat(goodLeds);
      }
      onChangeSelection(goodLeds)

      rectanglePath?.remove() // Удаляем старый прямоугольник
      rectanglePath = new paper.Path.Rectangle({
        point: rectTopLeft,
        size: rectSize,
        strokeColor: '#B4D5FE',
        strokeWidth: 2
      })
      // console.log('Selection End', event.point, rectanglePath.bounds)
      // Вызываем перерисовку канваса
      paper.view.draw()
    }

    // canvas.addEventListener('mouseup', onMouseUp);

    return () => {
      tool.remove() // Очистка ресурсов
      canvas.removeEventListener('wheel', handleWheel)
      paper.project.clear()
    }
  }, [costume])

  useEffect(() => {
    const handleClick = event => {
      const cursor = getCursorPosition(event)
      const hitResult = paper.project.hitTest(cursor, { fill: true })
      if (hitResult?.item?.data?.movable == false) {
        handleClickLED(event, hitResult.item.data)
      }
    }
    updateCostume()

    canvasRef.current.addEventListener('click', handleClick)
    return () => {
      canvasRef.current?.removeEventListener('click', handleClick)
    }
  }, [selection, costume])

  return (
    <div className="costumeViewerCanvasHolder" style={{ display: 'flex' }}>
      <canvas
        ref={canvasRef}
        id='costumeCanvas'
        style={{ margin: '0 ', width: '600px', height: '400px' }}
      ></canvas>
    </div>
  )
}

export default CostumeViewer
