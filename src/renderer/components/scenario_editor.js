import React, { useEffect, useState } from 'react'
import {
  Box,
  Card,
  Stack,
  HStack,
  InputGroup,
  InputLeftAddon,
  Input,
  Select,
  Button,
  Spacer,
  IconButton
} from '@chakra-ui/react'

import { ArrowUpIcon, ArrowDownIcon, DeleteIcon } from '@chakra-ui/icons'

const ScenarioEditor = ({ scenario, changeScenario, finder }) => {
  const handleCostumeChange = (rowIndex, newCostume) => {
    console.log('Change costume', newCostume)
    const updatedRows = scenario.map((row, i) => {
      if (i === rowIndex) {
        return { ...row, costume: newCostume }
      }
      return row
    })
    changeScenario(updatedRows)
  }

  const handlePatternChange = (rowIndex, patternIndex, newPatternFile) => {
    const updatedRows = scenario.map((row, i) => {
      if (i === rowIndex) {
        const updatedPatterns = row.patterns.map((pattern, j) => {
          if (j === patternIndex) {
            return { ...pattern, name: newPatternFile }
          }
          return pattern
        })
        return { ...row, patterns: updatedPatterns }
      }
      return row
    })
    changeScenario(updatedRows)
  }

  const handlePauseLengthChange = (rowIndex, patternIndex, newLength) => {
    const updatedRows = scenario.map((row, i) => {
      if (i === rowIndex) {
        const updatedPatterns = row.patterns.map((pattern, j) => {
          if (j === patternIndex) {
            return { ...pattern, pause_len: parseInt(newLength) }
          }
          return pattern
        })
        return { ...row, patterns: updatedPatterns }
      }
      return row
    })
    changeScenario(updatedRows)
  }

  const addPattern = rowIndex => {
    const updatedRows = scenario.map((row, i) => {
      if (i === rowIndex) {
        return {
          ...row,
          patterns: [...row.patterns, { name: '', pause_len: 0 }]
        }
      }
      return row
    })
    changeScenario(updatedRows)
  }

  const addRow = () => {
    changeScenario([
      ...scenario,
      { costume: '', patterns: [{ name: '', pause_len: 0 }] }
    ])
  }

  const deleteRow = (rowIndex) => {
    const updatedRows = scenario.filter((_, i) => i !== rowIndex);
    changeScenario(updatedRows);
  };

  const moveRow = (rowIndex, direction) => {
    const newRows = [...scenario];
    if (direction === "up" && rowIndex > 0) {
      [newRows[rowIndex], newRows[rowIndex - 1]] = [newRows[rowIndex - 1], newRows[rowIndex]];
    } else if (direction === "down" && rowIndex < newRows.length - 1) {
      [newRows[rowIndex], newRows[rowIndex + 1]] = [newRows[rowIndex + 1], newRows[rowIndex]];
    }
    changeScenario(newRows);
  };


  const deletePattern = (rowIndex, patternIndex) => {
    const updatedRows = scenario.map((row, i) => {
      if (i === rowIndex) {
        const filteredPatterns = row.patterns.filter(
          (_, j) => j !== patternIndex
        )
        return { ...row, patterns: filteredPatterns }
      }
      return row
    })
    changeScenario(updatedRows)
  }

  const movePattern = (rowIndex, patternIndex, direction) => {
    const updatedRows = scenario.map((row, i) => {
      if (i === rowIndex) {
        const newPatterns = [...row.patterns]
        if (direction === 'up' && patternIndex > 0) {
          ;[newPatterns[patternIndex], newPatterns[patternIndex - 1]] = [
            newPatterns[patternIndex - 1],
            newPatterns[patternIndex]
          ]
        } else if (
          direction === 'down' &&
          patternIndex < newPatterns.length - 1
        ) {
          ;[newPatterns[patternIndex], newPatterns[patternIndex + 1]] = [
            newPatterns[patternIndex + 1],
            newPatterns[patternIndex]
          ]
        }
        return { ...row, patterns: newPatterns }
      }
      return row
    })
    changeScenario(updatedRows)
  }

  return (
    <Box m='1vw 5vw'>
      {/* <Card p={2}>
        <InputGroup size='sm'>
          <InputLeftAddon>ID Сценария</InputLeftAddon>
          <Input
            size='sm'
            variant='filled'
            value={scenario.id}
            placeholder='---'
            readOnly
          />
        </InputGroup>
      </Card> */}
      <Card m='1vw 0' p={2}>
        <Stack spacing={3}>
          {scenario.map((row, rowIndex) => (
            <HStack key={rowIndex} alignItems='start'>
              <Stack>
                {row.patterns.map((pattern, patternIndex) => (
                  <HStack key={patternIndex}>
                    <Input
                      width='350px'
                      maxWidth='350px'
                      type="number"
                      placeholder='Пауза, мс'
                      value={pattern.pause_len}
                      onChange={e =>
                        handlePauseLengthChange(
                          rowIndex,
                          patternIndex,
                          e.target.value
                        )
                      }
                    />
                    <Spacer />
                    <Select
                      value={pattern.name}
                      onChange={e =>
                        handlePatternChange(
                          rowIndex,
                          patternIndex,
                          e.target.value
                        )
                      }
                      placeholder='---'
                    >
                      {finder.patterns.map((option, idx) => (
                        <option key={idx} value={option.filePath}>
                          {option.name}
                        </option>
                      ))}
                    </Select>
                    <IconButton
                      icon={<ArrowUpIcon />}
                      onClick={() => movePattern(rowIndex, patternIndex, 'up')}
                      isDisabled={patternIndex === 0}
                    />
                    <IconButton
                      icon={<ArrowDownIcon />}
                      onClick={() =>
                        movePattern(rowIndex, patternIndex, 'down')
                      }
                      isDisabled={patternIndex === row.patterns.length - 1}
                    />
                    <IconButton
                      icon={<DeleteIcon />}
                      onClick={() => deletePattern(rowIndex, patternIndex)}
                    />
                  </HStack>
                ))}
                <Button onClick={() => addPattern(rowIndex)}>
                  + паттерн
                </Button>
              </Stack>
              <Select
                value={row.costume}
                onChange={e => handleCostumeChange(rowIndex, e.target.value)}
                placeholder='---'
              >
                {finder.costumes.map((option, idx) => (
                  <option key={idx} value={option.filePath}>
                    {option.name}
                  </option>
                ))}
              </Select>
              <IconButton
                icon={<ArrowUpIcon />}
                onClick={() => moveRow(rowIndex, 'up')}
                hidden={rowIndex === 0}
              />
              <IconButton
                icon={<ArrowDownIcon />}
                onClick={() =>
                  moveRow(rowIndex, 'down')
                }
                hidden={rowIndex === scenario.length - 1}
              />
              <IconButton
                icon={<DeleteIcon />}
                onClick={() => deleteRow(rowIndex)}
              />
            </HStack>
          ))}
          <Button onClick={addRow}>+ костюм</Button>
        </Stack>
      </Card>
    </Box>
  )
}

export default ScenarioEditor
