import React, {useState, useEffect, useCallback} from 'react'
import Quill, {TextChangeHandler} from 'quill'
import 'quill/dist/quill.snow.css'
import {io, Socket} from 'socket.io-client'
import {useParams} from 'react-router-dom'

const SAVE_INTERVAL = 5000
const TOOLBAR_OPTIONS = [
  [{ header: [1,2,3,4,5,6, false] }],
  [{ font: [] }],
  [{ list: 'ordered'}, {list: 'bullet'}],
  [ 'bold', 'italic', 'underline'],
  [ {color: []},{background: []}],
  [ {script: 'sub'}, {script: 'super'}],
  [ {align: []}],
  [ 'image','blockquote', 'code-block'],
  [ 'clean']
]

export default function TextEditor() {
  const { id: documentID } = useParams()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [quill , setQuill] = useState<Quill | null>(null)

  //establish connection with backend
  useEffect(() => {
    const soc = io('http://localhost:3001')
    setSocket(soc)

    return () => {
      soc.disconnect()
    }
  }, [])

  //handle text changes by user
  useEffect(() => {
    if (socket == null || quill == null)
      return

    const handleTextChange:TextChangeHandler = (delta, oldDelta, source) => {
      if (source !== 'user')
        return 
      socket?.emit('send-changes', delta)
    }

    quill?.on('text-change',  handleTextChange)

    return () => {
      quill?.off('text-change', handleTextChange)
    }
  },[socket, quill])

  //handle text changes by other users
  useEffect(() => {
    if (socket == null || quill == null)
      return

    const handleTextChange:TextChangeHandler = (delta) => {
      quill.updateContents(delta)
    }

    socket?.on('receive-changes',  handleTextChange)

    return () => {
      socket?.off('receive-changes', handleTextChange)
    }
  },[socket, quill])

  useEffect(() => {
    if (socket == null || quill == null)
      return

    socket.once('load-document' , document => {
      quill.setContents(document)
      quill.enable()
    })

    socket.emit('get-document', documentID)
  }, [socket, quill, documentID])

  useEffect(() => {
    if (socket == null || quill == null)
      return
    
    const interval = setInterval(() => {
      socket.emit('save-document', quill.getContents())
    }, SAVE_INTERVAL)

    return () => {
      clearInterval(interval)
    }
  }, [socket, quill])

  const wrapperRef = useCallback((wrapper:HTMLDivElement) => {
    if (wrapper == null) 
      return
    wrapper.innerHTML = ""
    const editor = document.createElement('div')
    wrapper.append(editor)
    const q = new Quill(editor, {
      theme: 'snow', 
      modules: { toolbar: TOOLBAR_OPTIONS}
    })
    q.disable()
    q.setText('Loading document...')
    setQuill(q)
  }, [])

  return (
    <div className='container' ref={wrapperRef}></div>
  )
}
