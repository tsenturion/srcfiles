import React, { useEffect, useRef, useState } from 'react'
import CostumeViewer from '../components/costume_viewer'
import { Box, Button, Stack, Divider, Flex, useToast, Heading } from '@chakra-ui/react'
import AudioTimeline from '../components/audio_timeline'
import { genUID } from '../../utils'
import ScenarioEditor from '../components/scenario_editor'

const ScenarioPage = ({ finder }) => {
  const [scenarioFile, setScenarioFile] = useState({
    filename: null,
    opened: false
  })
  const [selection, setSelection] = useState([]);
  const [patternData, setPatternData] = useState(null)
  const [costumesData, setCostumesData] = useState([])
  const [currentTime, setCurrentTime] = useState(0)
  const requestIdRef = useRef(null)
  const [playing, setPlaying] = useState(false)

  const toast = useToast()

  const loadCostumeData = async costumePath => {
    const readResult = await window.electron.readFile(costumePath)
    if (readResult.success) {
      return JSON.parse(readResult.data)
    } else {
      toast({
        title: 'Failed to load costume data',
        status: 'error',
        duration: 2000
      })
      return null
    }
  }

  const loadPatternData = async patternPath => {
    const readResult = await window.electron.readFile(patternPath)
    if (readResult.success) {
      return JSON.parse(readResult.data)
    } else {
      toast({
        title: 'Failed to load pattern data',
        status: 'error',
        duration: 2000
      })
      return null
    }
  }

  const animate = (start, longestTime) => {
    console.log(start, longestTime)
    const frame = () => {
      const newTime = new Date().getTime()
      const elapsed = newTime - start
      if (elapsed < longestTime) {
        console.log(elapsed)
        setCurrentTime(elapsed)
        requestIdRef.current = requestAnimationFrame(frame)
      } else {
        setPlaying(false)
        setCurrentTime(longestTime - start)
      }
    }
    requestIdRef.current = requestAnimationFrame(frame)
  }

  const createScenario = () => {
    setScenarioFile({
      id: genUID().toString(),
      filename: null,
      opened: true,
      saved: false,
      data: []
    })
  }

  const closeScenario = () => {
    setScenarioFile({
      ...scenarioFile,
      opened: false,
      data: null
    })
  }

  const saveScenario = async () => {
    if (!scenarioFile || !scenarioFile.data) {
      toast({
        title: 'Нет данных для сохранения.',
        status: 'error',
        duration: 2000
      })
      return
    }

    const options = {
      title: 'Сохранить сценарий',
      defaultPath: scenarioFile.filename || 'scenario.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    }

    const result = await window.electron.saveFile(options)

    if (result.canceled || !result.filePath) {
      toast('Сохранение отменено')
      return
    }

    const filePath = result.filePath
    const dataToSave = JSON.stringify(scenarioFile.data, null, 2)

    const writeResult = await window.electron.writeFile(filePath, dataToSave)

    if (writeResult.success) {
      toast({
        title: 'Файл сохранен.',
        description: filePath,
        status: 'success',
        duration: 5000,
        isClosable: false
      })
      const updatedCostume = {
        ...scenarioFile,
        filename: filePath,
        saved: true
      }
      setScenarioFile(updatedCostume)
    } else {
      toast({
        title: 'Ошибка при сохранении файла.',
        description: `${writeResult.error}`,
        status: 'error',
        duration: 5000,
        isClosable: false
      })
    }
  }

  const loadScenario = async filePath => {
    const readResult = await window.electron.readFile(filePath)

    if (readResult.success) {
      try {
        const loadData = JSON.parse(readResult.data)
        const updatedScenario = {
          ...scenarioFile,
          filename: filePath,
          opened: true,
          data: loadData,
          saved: true
        }
        setScenarioFile(updatedScenario)
        toast({
          title: 'Сценарий загружен',
          description: filePath,
          status: 'success',
          duration: 1000
        })
      } catch (error) {
        console.error('Ошибка при разборе JSON:', error)
        toast({
          title: 'Ошибка при разборе JSON',
          description: `${error}`,
          status: 'error',
          duration: 3000
        })
      }
    } else {
      toast({
        title: 'Ошибка при чтении файла',
        description: `${readResult.error}`,
        status: 'error',
        duration: 3000
      })
    }
  }

  const handleLoadScenario = async () => {
    const options = {
      title: 'Открыть сценарий файл',
      defaultPath: scenarioFile.filename || 'scenario.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    }
    const result = await window.electron.openFile(options)

    if (result.canceled || !result.filePaths.length) {
      toast({
        title: 'Открытие отменено',
        description: ``,
        status: 'info',
        duration: 2000,
        isClosable: false
      })
      return
    }

    const filePath = result.filePaths[0]

    await loadScenario(filePath)
  }

  const playScenarioScreen = async () => {
    setCurrentTime(0);
    if (!scenarioFile.data || scenarioFile.data.length === 0) {
      toast({ title: 'No scenario loaded', status: 'error', duration: 2000 })
      return
    }

    let longestTime = 0
    const newCostumesData = []
    for (const ent of scenarioFile.data) {
      const costumePath = ent.costume
      const patterns = ent.patterns
      const bigPattern = {
        seqs: [],
        currentTime: 0
      }

      let lastTime = 0

      for (const pattern of patterns) {
        const patternData = await loadPatternData(pattern.name)
        bigPattern.seqs = bigPattern.seqs.concat(
          patternData.pattern.seqs.map(x => {
            return {
              ...x,
              sequence: x.sequence.map(y => {
                return {
                  start: y.start + lastTime,
                  end: y.end + lastTime,
                  color: y.color
                }
              })
            }
          })
        )
        let duration = await window.electron.trackDuration(
          patternData.music.filename
        )
        duration += parseInt(pattern.pause_len);
        console.log(duration)
        lastTime += duration; // Используйте музыкальную длительность из метаданных
      }
      longestTime = Math.max(longestTime, lastTime)
      const newData = {
        name: costumePath,
        data: await loadCostumeData(costumePath),
        bigPattern: bigPattern
      }
      newCostumesData.push(newData)
    }
    console.log(newCostumesData)
    setCostumesData(newCostumesData)
    setPlaying(true)
    animate((new Date()).getTime(), (new Date()).getTime() + longestTime)
  }

  const playScenarioCostumes = async () => {}

  const sendDataToCostumes = () => {
    // Логика для передачи данных на костюмы
  }

  const createScenarioArchive = () => {
    // Логика для формирования архива сценария
  }

  const testCostumes = () => {
    // Логика для тестирования костюмов
  }

  useEffect(() => {
    return () => {
      if (requestIdRef.current) {
        cancelAnimationFrame(requestIdRef.current)
      }
    }
  }, [])

  return (
    <Box>
      <Box display='inline' alignItems='center'>
        <Button colorScheme='teal' size='sm' m={1} onClick={createScenario}>
          📄 Создать сценарий
        </Button>
        {scenarioFile.opened && (
          <>
            <Button colorScheme='teal' size='sm' m={1} onClick={closeScenario}>
              ❌ Закрыть сценарий
            </Button>
            <Button colorScheme='teal' size='sm' m={1} onClick={saveScenario}>
              💾 Сохранить сценарий
            </Button>
            <Button
              colorScheme='teal'
              size='sm'
              // isDisabled={true}
              m={1}
              onClick={playScenarioScreen}
            >
              ▶️ Воспроизвести на экране
            </Button>
            <Button
              colorScheme='teal'
              size='sm'
              isDisabled={true}
              m={1}
              onClick={playScenarioCostumes}
            >
              ▶️👗 Воспроизвести на костюмах и экране
            </Button>
            <Button
              colorScheme='teal'
              size='sm'
              isDisabled={true}
              m={1}
              onClick={sendDataToCostumes}
            >
              🚀 Передача данных на костюмы
            </Button>
            <Button
              colorScheme='teal'
              size='sm'
              isDisabled={true}
              m={1}
              onClick={createScenarioArchive}
            >
              🗃️ Сформировать архив сценария
            </Button>
            <Button
              colorScheme='teal'
              isDisabled={true}
              size='sm'
              m={1}
              onClick={testCostumes}
            >
              🧪 Тест костюмов
            </Button>
          </>
        )}

        <Button colorScheme='teal' size='sm' m={1} onClick={handleLoadScenario}>
          📂 Открыть сценарий
        </Button>
      </Box>
      {scenarioFile.opened && (
        <>
          <ScenarioEditor
            scenario={scenarioFile.data}
            changeScenario={data => {
              setScenarioFile({ ...scenarioFile, data })
            }}
            finder={finder}
          ></ScenarioEditor>
          <Stack overflowY='scroll' width='full' padding='4'>
            {costumesData.slice(0, 6).map((costume, index) => (
              <Stack spacing={1}>
                <Heading as='h4' size='md'>{costume.name}</Heading>
                <CostumeViewer
                key={index}
                selection={selection}
                costume={costume.data}
                pattern={costume.bigPattern}
                currentTime={currentTime}
                onChangeSelection={() => {}}
              />
                </Stack>
            ))}
          </Stack>
        </>
      )}
    </Box>
  )
}

export default ScenarioPage
