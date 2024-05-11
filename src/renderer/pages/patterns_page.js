import React, { useEffect, useRef, useState } from 'react'
import CostumeViewer from '../components/costume_viewer'
import {
  Box,
  Button,
  Stack,
  Divider,
  HStack,
  Select,
  InputGroup,
  InputLeftAddon,
  Card,
  TagLabel
} from '@chakra-ui/react'
import AudioTimeline from '../components/audio_timeline'
import { genUID } from '../../utils'

const PatternsPage = ({ finder }) => {
  const [currentTime, setCurrentTime] = useState([])

  const [selectedCostume, setSelectedCostume] = useState({
    filePath: null,
    data: null
  })
  const [ledSelection, onChangeLedSelection] = useState([])
  const [selectedMusic, setSelectedMusic] = useState({
    filePath: null,
    data: null
  })

  const [patternFile, setPatternFile] = useState({})
  const [pattern, setPattern] = useState({})

  const loadCostume = async filePath => {
    const readResult = await window.electron.readFile(filePath)

    if (readResult.success) {
      try {
        const loadCostumeData = JSON.parse(readResult.data)
        const updatedCostume = {
          ...selectedCostume,
          filename: filePath,
          opened: true,
          data: loadCostumeData,
          saved: true
        }
        setSelectedCostume(updatedCostume)
        console.log('Costume loaded', loadCostumeData)
      } catch (error) {
        console.error('Ошибка при разборе JSON:', error)
      }
    } else {
      console.error('Ошибка при чтении файла:', readResult.error)
    }
  }

  const loadMusic = async filePath => {
    const readResult = await window.electron.readRawFile(filePath)

    if (readResult.success) {
      try {
        const loadMusicData = readResult.data
        const updatedMusicData = {
          ...selectedMusic,
          filename: filePath,
          opened: true,
          data: loadMusicData,
          saved: true
        }
        setSelectedMusic(updatedMusicData)
        console.log('Music loaded', updatedMusicData)
      } catch (error) {
        console.error('Ошибка при разборе MP3:', error)
        alert(`Ошибка при разборе MP3: ${error}`)
      }
    } else {
      console.error('Ошибка при чтении файла:', filePath, readResult.error)
      alert(`Ошибка при чтении файла: ${filePath}. ${readResult.error}`)
      return 'READ_ERROR'
    }
  }

  const handleLoadMusic = async () => {
    const options = {
      title: 'Открыть аудио файл',
      defaultPath: selectedMusic.filename || 'music.mp3',
      filters: [{ name: 'MP3', extensions: ['mp3'] }]
    }
    const result = await window.electron.openFile(options)

    if (result.canceled || !result.filePaths.length) {
      console.log('Открытие файла отменено пользователем.')
      return
    }

    const filePath = result.filePaths[0]

    await loadMusic(filePath)
  }

  const loadPattern = async filePath => {
    const readResult = await window.electron.readFile(filePath)

    if (readResult.success) {
      try {
        const loadData = JSON.parse(readResult.data)
        const updated = {
          ...patternFile,
          filename: filePath,
          opened: true,
          data: loadData,
          saved: true
        }
        setPatternFile(updated)
        const load_music_result = loadMusic(loadData.music?.filename)
        if (load_music_result == 'READ_ERROR') {
          return load_music_result
        }
        setPattern(loadData.pattern)
        console.log('Loaded', loadData)
      } catch (error) {
        alert('Ошибка при разборе JSON:', error)
      }
    } else {
      alert('Ошибка при чтении файла:', readResult.error)
    }
  }
  const handleOpenPattern = async () => {
    const options = {
      title: 'Открыть паттерн',
      defaultPath: selectedCostume.filename || 'led_patttern.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    }
    const result = await window.electron.openFile(options)

    if (result.canceled || !result.filePaths.length) {
      console.log('Открытие файла отменено пользователем.')
      return
    }

    const filePath = result.filePaths[0]

    await loadPattern(filePath)
  }

  const newPattern = () => {
    const updated = {
      fileName: null,
      opened: true,
      saved: false,
      data: { seqs: [], currentTime: 0 }
    }
    setSelectedCostume({
      filePath: null,
      data: null
    })
    setSelectedMusic({
      filePath: null,
      data: null
    })
    setPatternFile(updated)
    setPattern({ seqs: [], currentTime: 0 })
  }

  const closePattern = () => {
    const updated = {
      ...pattern,
      opened: false,
      data: null
    }
    setSelectedCostume({
      filePath: null,
      data: null
    })
    setSelectedMusic({
      filePath: null,
      data: null
    })
    setPatternFile(updated)
    setPattern(null)
  }

  const savePattern = async () => {
    if (!pattern || !patternFile.data) {
      console.error('Нет данных для сохранения.')
      return
    }

    const options = {
      title: 'Сохранить паттерн',
      defaultPath: patternFile.filename || 'led_pattern.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    }

    const result = await window.electron.saveFile(options)

    if (result.canceled || !result.filePath) {
      console.log('Сохранение файла отменено пользователем.')
      return
    }

    const filePath = result.filePath
    const dataToSave = JSON.stringify(
      {
        music: {
          filename: selectedMusic.filename
        },
        pattern: pattern
      },
      null,
      2
    )

    const writeResult = await window.electron.writeFile(filePath, dataToSave)

    if (writeResult.success) {
      console.log('Файл успешно сохранен:', filePath)
      const updated = {
        ...patternFile,
        filename: filePath,
        saved: true
      }
      setPatternFile(updated)
    } else {
      console.error('Ошибка при сохранении файла:', writeResult.error)
    }
  }
  console.log(finder)

  return (
    <>
      <Box my={2} display='inline' alignItems='center' justifyContent='left'>
        <Button colorScheme='teal' size='sm' m={1} onClick={handleOpenPattern}>
          📂 Открыть паттерн
        </Button>
        <Button colorScheme='teal' size='sm' m={1} onClick={newPattern}>
          📄 Новый паттерн
        </Button>
        {patternFile.opened && (
          <>
            <Button colorScheme='teal' size='sm' m={1} onClick={closePattern}>
              ❌ Закрыть паттерн
            </Button>
            {!patternFile.saved && (
              <Button colorScheme='teal' size='sm' m={1} onClick={savePattern}>
                💾 Сохранить паттерн
              </Button>
            )}
            {/* <Button
              colorScheme='teal'
              size='sm'
              m={1}
              onClick={handleLoadMusic}
            >
              🎵 Открыть файл музыки
            </Button> */}
          </>
        )}
      </Box>
      {patternFile.opened && (
        <Card bgColor={'#00000030'} p={2} m={2}>
          <HStack>
            <InputGroup size='sm'>
              <InputLeftAddon>Музыка</InputLeftAddon>
              <Select
                bgColor={'white'}
                placeholder='---'
                onChange={async e => {
                  const filePath = e.target.value
                  loadMusic(filePath)
                }}
                size='sm'
              >
                {finder.music.map(x => (
                  <option key={x.filePath} value={x.filePath}>
                    {x.name}
                  </option>
                ))}
              </Select>
            </InputGroup>
            <InputGroup size='sm'>
              <InputLeftAddon>Костюм</InputLeftAddon>
              <Select
                bgColor={'white'}
                placeholder='---'
                value={selectedCostume.filename}
                onChange={async e => {
                  const filePath = e.target.value
                  loadCostume(filePath)
                }}
                size='sm'
              >
                {finder.costumes.map(x => (
                  <option key={x.filePath} value={x.filePath}>
                    {x.name}
                  </option>
                ))}
              </Select>
            </InputGroup>
          </HStack>
        </Card>
      )}
      {pattern && (
        <>
          <Box>
            {selectedCostume.data && (
              <CostumeViewer
                className='costume-viewer'
                costume={selectedCostume.data}
                selection={ledSelection}
                onChangeSelection={onChangeLedSelection}
                pattern={pattern}
                currentTime={currentTime}
              />
            )}
          </Box>

          <Box>
            {selectedMusic.opened && (
              <AudioTimeline
                audioFile={selectedMusic}
                selection={ledSelection}
                onChangeSelection={onChangeLedSelection}
                pattern={pattern}
                updatePattern={setPattern}
                updateCurrentTime={setCurrentTime}
              />
            )}
          </Box>
        </>
      )}
    </>
  )
}

export default PatternsPage
