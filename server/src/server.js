const mongoose = require('mongoose')
const Document = require('./Document')
const io = require('socket.io')(3001, {
    cors: {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST']
    }
})

mongoose.connect(`${process.env.DB_CONNECTION}/${process.env.DB_NAME}`)

io.on('connection', socket => {
    socket.on('get-document', async documentID => {
        const document = await findOrCreateDocument(documentID)
        socket.join(documentID)
        socket.emit('load-document', document.data)
        
        socket.on('send-changes', delta => {
            socket.broadcast.to(documentID).emit('receive-changes', delta)
        })

        socket.on('save-document', async data => {
            await Document.findByIdAndUpdate(documentID, { data })
        })
    })
})

const DEFAULT_VALUE = 'New document'

async function findOrCreateDocument(id) {
    if (id == null)
        return
    const doc = await Document.findById(id)
    if (doc)
        return doc
    return await Document.create({
        _id: id, 
        data: DEFAULT_VALUE
    })
}