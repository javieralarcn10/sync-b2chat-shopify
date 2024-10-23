import express from 'express'
import router from './router.mjs'
import bodyParser from "body-parser";

const port = process.env.PORT || 3000

const app = express()
app.use(bodyParser.json());

app.use('/', router)
app.listen(port, () => console.log(`Sync api listening on port ${port}!`))