import React, { useEffect, useRef, useState } from 'react'

import {
  Box,
  Flex,
  Checkbox,
  FormControl,
  FormLabel,
  Select,
  Input,
  InputGroup,
  InputRightElement,
  Button,
  useToast,
  Spacer,
  IconButton,
  Card,
  Stack,
  HStack
} from '@chakra-ui/react'
import { FaFolderOpen } from 'react-icons/fa6'

import { darkenColor, toMS, genUID } from './../../utils'
import { RepeatIcon } from '@chakra-ui/icons'

const Finder = ({ finder, setFinder }) => {
  const fetchAll = async () => {
    try {
      const patterns = await window.electron.readCatalog('data/patterns/')
      const costumes = await window.electron.readCatalog('data/costumes/')
      const music = await window.electron.readCatalog('data/music/')
      setFinder({ ...finder, patterns, music, costumes })
    } catch (error) {
      console.error('Failed to read patterns:', error)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  return (
    <Box>
      <Button bgColor='#ffffffba'
        colorScheme='blue'
        variant='outline'
        leftIcon={<RepeatIcon />}
        onClick={fetchAll}
      >
        Reload
      </Button>
    </Box>
  )
}

export default Finder
