import React, { useEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline.esm.js'
import Minimap from 'wavesurfer.js/dist/plugins/minimap.esm.js'
import { DataSet, Timeline } from 'vis-timeline/standalone'
import 'vis-timeline/styles/vis-timeline-graph2d.min.css'
import { moment } from 'vis-timeline/standalone'

import {
  Box,
  Flex,
  Checkbox,
  FormControl,
  FormLabel,
  Input,
  Button,
  useToast,
  IconButton
} from '@chakra-ui/react'

import { darkenColor, toMS, genUID } from './../../utils'
import { RepeatIcon } from '@chakra-ui/icons'
const AudioTimeline = ({
  audioFile,
  initialItems,
  initialGroups,
  selection,
  onChangeSelection,
  pattern,
  updatePattern,
  updateCurrentTime
}) => {
  const patternRef = useRef(pattern)
  const waveSurferRef = useRef(null)
  const timelineRef = useRef(null)
  const [timeline, setTimeline] = useState(null)
  let [items] = useState(new DataSet(initialItems))
  const [groups] = useState(new DataSet(initialGroups))
  const [isPlaying, setIsPlaying] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [markerDetails, setMarkerDetails] = useState({
    start: 0,
    end: 0,
    color: '#FFFFFF'
  })
  const [zoomValue, setZoomValue] = useState(20)
  const [isAllGroups, setAllGroups] = useState(false)
  const [trackDurationMs, setTrackDurationMs] = useState(10 * 60 * 1000) // Продолжительность трека в миллисекундах
  const visStyles = `
  .vis-timeline.vis-bottom.vis-ltr {
    border-radius: 10px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.4);
    background-color: #2a2a2a;
  }
  .vis-labelset .vis-label {
    color: #bababa;
  }
  .vis-text {
    color: #bababa !important;
  }
  .vis-item .vis-delete {
      right: -15px;
      width: 15px;
      height: 100%;
  }
  .vis-item .vis-delete:after, .vis-item .vis-delete-rtl:after {
    content: "×";
    color: red;
    font-family: arial, sans-serif;
    font-size: 15px;
    font-weight: bold;
    -webkit-transition: color 0.2s linear;
    -moz-transition: color 0.2s linear;
    -ms-transition: color 0.2s linear;
    -o-transition: color 0.2s linear;
    transition: color 0.2s linear;
}
  `
  const onChangeItems = (items_dataset, changed_item) => {
    const newPattern = { ...pattern }
    const seq_index = newPattern.seqs.findIndex(e => e.id == changed_item.group)
    const itemsArray = items_dataset.get({ returnType: 'Array' })

    if (seq_index >= 0) {
      newPattern.seqs[seq_index].sequence = itemsArray
        .filter(x => x.group == changed_item.group)
        .map(x => {
          return { start: x.start, end: x.end, color: x.className }
        })
      console.log('New pattern', newPattern)
      updatePattern(newPattern)
    } else {
    }
  }

  useEffect(() => {
    if (!selection || selection.length === 0) {
      if (isAllGroups) {
        selection = []
      } else {
        return
      }
    }

    const gSelectionSet = new Set(selection)
    const selectionSet = new Set(selection)
    const newData = []
    items.clear()
    groups.clear()

    pattern.seqs.forEach(seq => {
      const seqLedsSet = new Set(seq.leds)
      const intersects = seq.leds.some(led => selectionSet.has(led))
      if (!intersects && !isAllGroups) return

      seq.leds.forEach(x => gSelectionSet.delete(x))

      const gp = {
        id: seq.id,
        content: `SEQ_${seq.id}`,
        value: seq.leds
      }
      groups.add(gp)

      seq.sequence.forEach((item, i) => {
        newData.push({
          id: `${seq.id}-${i}`,
          content: '',
          start: toMS(item.start),
          end: toMS(item.end),
          className: item.color,
          group: gp.id,
          style: `background-color: ${item.color}; border-color: ${darkenColor(
            item.color
          )};`
        })
      })
    })

    // Проверяем, остались ли неиспользованные элементы
    if (gSelectionSet.size > 0) {
      groups.add({
        id: '?',
        content: 'SEQ_?',
        value: Array.from(selection)
      })
    }
    items.update(newData)

    timeline?.redraw()
  }, [selection, pattern, isAllGroups])

  useEffect(() => {
    patternRef.current = pattern
  }, [pattern])

  useEffect(() => {
    // Инициализация WaveSurfer с плагинами
    waveSurferRef.current = WaveSurfer.create({
      container: '#waveform',
      height: 70,
      dragToSeek: true,
      waveColor: '#ff4e00',
      progressColor: '#dd5e98',
      cursorColor: '#ddd5e9',
      autoCenter: true,
      cursorWidth: 2,
      autoScroll: true,
      barWidth: 1,
      hideScrollbar: true,
      responsive: true,
      minPxPerSec: zoomValue,
      plugins: [
        TimelinePlugin.create(),
        Minimap.create({ height: 20, waveColor: '#ddd', progressColor: '#999' })
      ]
    })

    // Загрузка аудиофайла
    if (audioFile) {
      const audioBlob = new Blob([audioFile.data], { type: 'audio/mp3' })
      waveSurferRef.current.loadBlob(audioBlob)
    }

    // Обработчик клавиши пробела
    const handleKeyDown = e => {
      if (e.key === ' ') {
        e.preventDefault();
        setShowForm(false)
        waveSurferRef.current.playPause()
      }
    }

    const onReady = () => {
      const duration = waveSurferRef.current.getDuration() * 1000 // Длительность в миллисекундах
      setTrackDurationMs(duration)
    }
    // Устанавливаем длительность после загрузки
    waveSurferRef.current.on('ready', onReady)

    document.addEventListener('keydown', handleKeyDown)
    // Добавление обработчика события прокрутки
    const handleZoomScrollChange = event => {
      if (!event.altKey) {
        return
      }
      event.preventDefault()

      const waveform = document.getElementById('waveform')
      const czoom = waveform.getAttribute('zoomValue') || zoomValue
      const currentZoomValue = parseFloat(czoom)

      // Рассчитываем координаты курсора относительно элемента
      const rect = waveform.getBoundingClientRect()
      const cursorX = event.clientX - rect.left // X координата курсора относительно waveform

      // Определение текущего видимого диапазона
      const scrollParent = waveform.querySelector('.canvases')

      const visibleWidth = rect.width
      const totalWidth = 2000
      let scrollLeft = 0

      // Относительное положение курсора в видимой области
      const relativeCursorPos = (cursorX + scrollLeft) / totalWidth

      const newZoomValue = Math.min(
        500,
        Math.max(0, currentZoomValue + event.deltaY * 0.01)
      )

      // Зум относительно позиции курсора
      if (waveSurferRef.current) {
        waveSurferRef.current.zoom(newZoomValue)
        // Перемещаем скролл так, чтобы курсор оставался на том же месте
        const newScrollLeft =
          relativeCursorPos *
            newZoomValue *
            waveSurferRef.current.getDuration() -
          cursorX
        // scrollParent.scrollLeft = newScrollLeft
      }
      waveform.setAttribute('zoomValue', newZoomValue)
    }
    document
      .getElementById('waveform')
      .addEventListener('wheel', handleZoomScrollChange)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document
        .getElementById('waveform')
        ?.removeEventListener('wheel', handleZoomScrollChange)
      waveSurferRef.current.destroy()
    }
  }, [audioFile])

  // Инициализация и синхронизация таймлайна
  useEffect(() => {
    const tm_options = {
      editable: {
        add: false,
        updateTime: true,
        remove: true
      },
      clickToUse: false,
      horizontalScroll: true,
      zoomKey: 'altKey',
      stack: false,
      stackSubgroups: false,
      zoomFriction: -4,
      zoomMin: 200,
      zoomMax: 30 * 60 * 1000,
      showCurrentTime: true,
      selectable: true,
      multiselect: false,
      autoResize: true,
      snap: date => date,
      onMove: (item, callback) => {
        callback(item)
        items.update(item)
        onChangeItems(items, item)
      },
      onRemove: (item, callback) => {
        callback(item)
        items.remove(item.id)
        onChangeItems(items, item)
      },
      onMoving: (item, callback) => {
        setMarkerDetails({
          item: { ...item },
          color: item.className ?? '#FFFFFF',
          itemID: item.id,
          start: toMS(item.start),
          end: toMS(item.end)
        })
        callback(item)
      },
      start: new Date(0),
      min: new Date(0),
      max: trackDurationMs,
      end: trackDurationMs, // Пример - 10 минут в миллисекундах
      timeAxis: { scale: 'minute', step: 1 / 6 }, // Шкала в минутах
      format: {
        minorLabels: {
          second: 'mm:ss',
          minute: 'mm:ss',
          hour: 'mm:ss',
          weekday: 'mm:ss',
          day: 'mm:ss'
        },
        majorLabels: {
          second: 'mm:ss:SSS',
          minute: 'mm:ss:SSS',
          hour: 'mm:ss:SSS',
          weekday: 'mm:ss:SSS',
          day: 'mm:ss:SSS',
          week: 'mm:ss:SSS'
        }
      }
    }

    const newTimeline = new Timeline(
      timelineRef.current,
      items,
      groups,
      tm_options
    )

    const updateTimeline = () => {
      const currentTimeMs = waveSurferRef.current.getCurrentTime() * 1000
      newTimeline.moveTo(currentTimeMs, {
        animation: { duration: 300, easingFunction: 'easeInOutQuad' }
      })
      try {
        newTimeline?.setCustomTime(currentTimeMs, 'currentTime')
        updateCurrentTime(currentTimeMs)
      } catch (e) {
        console.log('not initialized', e)
      }
    }

    const onSelectMarker = props => {
      if (props.items.length > 0) {
        const itemId = props.items[0]

        const item = items.get(itemId)
        console.log(item)
        setMarkerDetails({
          item: { ...item },
          itemId: itemId,
          start: toMS(item.start),
          end: toMS(item.end),
          color: item.className || '#FFFFFF' // Указываем стандартный класс или белый цвет
        })
        setShowForm(true)
        const seq_index = patternRef.current.seqs.findIndex(
          x => x.id == item.group
        )
        console.log(seq_index, item.group, patternRef.current.seqs)
        if (seq_index >= 0) {
          onChangeSelection(patternRef.current.seqs[seq_index].leds)
        } else {
        }
      } else {
        setShowForm(false)
      }
    }

    // Синхронизация аудио при перемещении метки на таймлайне
    const onTimeChange = event => {
      const newTimeSec = event.time / 1000
      waveSurferRef.current.setTime(newTimeSec)
      updateCurrentTime(event.time)
    }

    // Синхронизация таймлайна с аудио
    waveSurferRef.current.on('audioprocess', updateTimeline)
    waveSurferRef.current.on('seek', updateTimeline)
    waveSurferRef.current.on('drag', updateTimeline)
    waveSurferRef.current.on('timeupdate', updateTimeline)
    waveSurferRef.current.on('click', updateTimeline)

    newTimeline.on('select', onSelectMarker)
    newTimeline.on('timechange', onTimeChange)

    newTimeline.addCustomTime(0, 'currentTime') // Установка начального времени
    setTimeline(newTimeline)

    return () => {
      newTimeline.off('select', onSelectMarker)
      newTimeline.off('timechange', onTimeChange)
      newTimeline.destroy()
    }
  }, [items, groups, trackDurationMs])

  useEffect(() => {
    if (!timeline) {
      return
    }
    const onTimelineClick = props => {
      if (props.event.metaKey && props.group != null) {
        // Добавляем маркер в место клика на 10 секунд вперед
        const markerStartTime = props.time
        const markerEndTime = new Date(props.time) // Добавляем 10 секунд

        // Добавляем 10 секунд к текущему времени
        markerEndTime.setSeconds(markerStartTime.getSeconds() + 1)
        const newGroupId = genUID()
        const item = {
          id: genUID(),
          content: '',
          start: toMS(markerStartTime),
          end: toMS(markerEndTime),
          group: props.group == '?' ? newGroupId : props.group,
          className: '#FFFFFF'
        }
        items.add(item)
        const newPattern = { ...pattern }
        const seq_index = newPattern.seqs.findIndex(e => e.id == props.group)
        console.log(props.group, seq_index, props.group == '?')
        const p_data = {
          start: item.start,
          end: item.end,
          color: item.className
        }
        if (seq_index >= 0) {
          newPattern.seqs[seq_index].sequence.push(p_data)
        } else {
          newPattern.seqs.push({
            sequence: [p_data],
            leds: [...selection],
            id: newGroupId
          })
        }
        console.log('New pattern', newPattern)
        updatePattern(newPattern)
      } else if (props.item == null && props.items == null) {
        setShowForm(false)
        const newTimeMSec = toMS(props.time)
        waveSurferRef.current.setTime(newTimeMSec / 1000)
        try {
          timeline.setCustomTime(newTimeMSec, 'currentTime')
          updateCurrentTime(newTimeMSec)
        } catch (e) {
          console.log('not initialized', e)
        }
      }
    }
    timeline.on('click', onTimelineClick)

    return () => {
      timeline.off('click', onTimelineClick)
    }
  }, [selection, timeline, pattern])

  useEffect(() => {
    const itemId = markerDetails.itemId

    console.log(markerDetails.color, darkenColor(markerDetails.color))
    items.update({
      id: itemId,
      start: toMS(markerDetails.start),
      className: markerDetails.color,
      end: toMS(markerDetails.end),
      style: `background-color: ${
        markerDetails.color
      }; border-color: ${darkenColor(markerDetails.color)};` // предполагается, что `className` используется для управления цветом
    })
    if (markerDetails.hard) {
      onChangeItems(items, markerDetails.item)
      setMarkerDetails({ ...markerDetails, hard: false })
    }

    timeline?.redraw()
  }, [markerDetails])

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
    waveSurferRef.current.playPause()
  }

  return (
    <div>
      <div
        id='waveform'
        style={{ width: '100%', margin: '10px 0', height: '120px' }}
      ></div>
      {showForm && (
        <Box
          padding='10px'
          bg='white'
          boxShadow='0 2px 10px rgba(0,0,0,0.1)'
          borderRadius={'4px'}
          maxWidth='580px'
          m={'10px auto'}
        >
          <Flex gap='4'>
            <FormControl id='start-time'>
              <FormLabel>Start time (ms):</FormLabel>
              <Input
                type='number'
                step='1'
                value={toMS(markerDetails.start)}
                onChange={e => {
                  setMarkerDetails({
                    ...markerDetails,
                    hard: true,
                    start: parseInt(e.target.value, 10)
                  })
                }}
              />
            </FormControl>
            <FormControl id='end-time'>
              <FormLabel>End time (ms):</FormLabel>
              <Input
                type='number'
                step='1'
                value={markerDetails.end}
                onChange={e => {
                  setMarkerDetails({
                    ...markerDetails,
                    hard: true,
                    end: parseInt(e.target.value, 10)
                  })
                }}
              />
            </FormControl>
            <FormControl id='color-picker'>
              <FormLabel>Color:</FormLabel>
              <Input
                type='color'
                value={markerDetails.color}
                onChange={e => {
                  setMarkerDetails({
                    ...markerDetails,
                    color: e.target.value
                  })
                }}
              />
            </FormControl>
            {markerDetails.item.className != markerDetails.color && (
              <IconButton
                style={{ alignSelf: 'end' }}
                aria-label='Update'
                onClick={e => onChangeItems(items, markerDetails.item)}
                icon={<RepeatIcon />}
              ></IconButton>
            )}
          </Flex>
        </Box>
      )}
      {audioFile.data != null && (<>
      <style>{visStyles}</style>
      <Box>
        <Checkbox
          size='md'
          colorScheme='green'
          isChecked={isAllGroups}
          onChange={e => {
            setAllGroups(e.target.checked)
            onChangeSelection([...selection])
          }}
        >
          All groups
        </Checkbox>
      </Box>
      </>)}
      <div ref={timelineRef} style={{ display: audioFile.data == null ? "none" : "block", height: 'auto' }} />

    </div>
  )
}

export default AudioTimeline
