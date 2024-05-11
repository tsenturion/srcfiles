import React, { useEffect, useRef, useState } from 'react'
import CostumeEditor from '../components/costume_editor'
import { Box, Button, Stack, useToast, Divider, Card, HStack, AlertDialogOverlay, AlertDialogHeader, AlertDialogBody, AlertDialogFooter,
  AlertDialogContent,useDisclosure, AlertDialog, InputGroup, InputLeftAddon, Select } from '@chakra-ui/react'
import AudioTimeline from '../components/audio_timeline'
import { genUID } from '../../utils'

const CostumesPage = ({finder}) => {
  const [selectedCostume, setSelectedCostume] = useState({
    opened: false,
    data: [],
    filename: null,
    saved: true
  })

  const { isOpen, onOpen, onClose } = useDisclosure()
  const [pendingAction, setPendingAction] = useState(null); // State to hold the pending action



  const handleUnsavedChanges = (action) => {
    if (!selectedCostume.saved) {
      setPendingAction(() => action); // Store the action as a function
      onOpen();
    } else {
      action();
    }
  };

  const confirmAction = () => {
    if (pendingAction) {
      pendingAction(); // Execute the pending action
      setPendingAction(null); // Clear the pending action
    }
    onClose();
  };


  const onChangeCostume = newCostumeData => {
    const updatedCostume = {
      ...selectedCostume,
      data: newCostumeData,
      saved: false
    }
    setSelectedCostume(updatedCostume)
    console.log(selectedCostume)
  }
  const toast = useToast()


  const loadCostume = async filePath => {
    const readResult = await window.electron.readFile(filePath);

    if (readResult.success) {
      try {
        const loadCostumeData = JSON.parse(readResult.data);
        setSelectedCostume({
          ...selectedCostume,
          filename: filePath,
          opened: true,
          data: loadCostumeData,
          saved: true
        });
        toast({title: "Костюм открыт", description: filePath, status: 'info', duration: 1000});
      } catch (error) {
        toast({title: "Ошибка при открытии костюма", description: `${error}`, status: 'error', duration: 2000});
      }
    } else {
      toast({title: "Ошибка при открытии костюма", description: `${readResult.error}`, status: 'error', duration: 2000});
    }
  };

  const handleOpenCostume = async () => {
    const options = {
      title: 'Открыть костюм',
      defaultPath: selectedCostume.filename || 'costume.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    }
    const result = await window.electron.openFile(options)

    if (result.canceled || !result.filePaths.length) {
      toast({title: "Открытие отменено пользователем", status: 'info', duration: 1000})
      return
    }

    const filePath = result.filePaths[0]

    await loadCostume(filePath)
  }

  const createCostume = () => {
    handleUnsavedChanges(() => {
      setSelectedCostume({ opened: true, data: [], saved: true, filename: null });
      toast({title: "Костюм создан", status: 'info', duration: 1000});
    });
  };

  const saveCostume = async () => {
    if (!selectedCostume || !selectedCostume.data) {
      toast({title: "Нет данных для сохранения", status: 'error', duration: 2000})
      return
    }

    const options = {
      title: 'Сохранить костюм',
      defaultPath: selectedCostume.filename || 'costume.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    }

    const result = await window.electron.saveFile(options)

    if (result.canceled || !result.filePath) {
      toast({title: "Сохранение отменено пользователем", status: 'info', duration: 1000})
      return
    }

    const filePath = result.filePath
    const dataToSave = JSON.stringify(selectedCostume.data, null, 2)

    const writeResult = await window.electron.writeFile(filePath, dataToSave)

    if (writeResult.success) {
      toast({title: "Костюм сохранён!", description: filePath, status: 'success', duration: 2000})
      const updatedCostume = {
        ...selectedCostume,
        filename: filePath,
        saved: true
      }
      setSelectedCostume(updatedCostume)
    } else {
      console.error('Ошибка при сохранении файла:', writeResult.error)
    }
  }


  return (
    <Box>
      <AlertDialog
        isOpen={isOpen}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize='lg' fontWeight='bold'>
              Текущая работа не сохранена
            </AlertDialogHeader>

            <AlertDialogBody>
              Вы уверены что хотите так сделать? Назад дороги не будет...
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button onClick={onClose}>
                Нет
              </Button>
              <Button colorScheme='red' onClick={confirmAction} ml={3}>
                Да, уверен
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
      <Box my={2} display='inline' alignItems='center' justifyContent='left'>
        <Button colorScheme='teal' size='sm' m={1} onClick={createCostume}>
          📄 Новый костюм
        </Button>
        {/* <Button colorScheme='teal' size='sm' m={1} onClick={handleOpenCostume}>
          📂 Открыть костюм
        </Button> */}
        {selectedCostume.data.length > 0 && (
          <Button colorScheme='teal' size='sm' m={1} onClick={saveCostume}>
            💾 Сохранить костюм
          </Button>
        )}
        <InputGroup display={'inline-flex'} w={'auto'} size='sm'>
          <InputLeftAddon>Открыть костюм</InputLeftAddon>
          <Select
            bgColor={'white'}
            placeholder='---'
            maxW={400}
            value={selectedCostume.filename}
            onChange={(e) => {
              const filePath = e.target.value;
              handleUnsavedChanges(() => {loadCostume(filePath)});
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
      </Box>

      {selectedCostume.opened && (
        <>
          <CostumeEditor
            className='costume-viewer'
            costume={selectedCostume.data}
            onChangeCostume={onChangeCostume}
          />
        </>
      )}
    </Box>
  )
}

export default CostumesPage
