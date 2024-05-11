import React, { useEffect, useRef, useState } from 'react'
import CostumeViewer from './costume_viewer'
import CostumeEditor from './costume_editor'
import { Box, Button, Stack, Divider, position } from '@chakra-ui/react'
import AudioTimeline from './audio_timeline'
import ScenarioEditor from './scenario_editor'
import { genUID } from '../../utils'
import PatternsPage from '../pages/patterns_page'
import CostumesPage from '../pages/costumes_page'
import ScenarioPage from '../pages/scenario_page'
import Finder from './finder'

const MainMenu = () => {
  const [menuCategory, setMenuCategory] = useState('')
  const [finder, setFinder] = useState({
    music: [],
    scenarios: [],
    costumes: [],
    patterns: []
  })

  const [patternFile, setPatternFile] = useState({})
  const [pattern, setPattern] = useState({})
  const fileInputRef = useRef(null)

  const toggleScenarioMenu = () => setMenuCategory('ScenarioMenu')
  const toggleMusicMenu = () => setMenuCategory('MusicMenu')
  const toggleCostumesMenu = () => setMenuCategory('CostumesMenu')
  const togglePatternsEditorMenu = () => setMenuCategory('PatternsEditorMenu')

  ///////////////////////////////////////////////////
  useEffect(() => {
    setMenuCategory('ScenarioMenu')
  }, [])

  return (
    <Box m={4}>
      <Box sx={{position: "absolute", right: 2}}>
      <Finder finder={finder} setFinder={setFinder}></Finder></Box>
        <Box display='flex' alignItems='center' justifyContent='center'>
          <Button mx={1} colorScheme='blue' onClick={toggleScenarioMenu}>
            Сценарий
          </Button>
          <Button mx={1} colorScheme='blue' onClick={toggleCostumesMenu}>
            Костюмы
          </Button>
          <Button mx={1} colorScheme='blue' onClick={togglePatternsEditorMenu}>
            Редактор паттернов
          </Button>
        </Box>
      <Box mt={1}></Box>
      {menuCategory === 'ScenarioMenu' && (
        <ScenarioPage finder={finder}></ScenarioPage>
      )}

      <div
        style={{ display: menuCategory === 'CostumesMenu' ? 'block' : 'none' }}
      >
        <CostumesPage finder={finder}></CostumesPage>
      </div>
      <div
        style={{
          display: menuCategory === 'PatternsEditorMenu' ? 'block' : 'none'
        }}
      >
        <PatternsPage finder={finder}></PatternsPage>
      </div>
    </Box>
  )
}

export default MainMenu
