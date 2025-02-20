import cors from "cors";
import {app, server} from "./lib/socketio.js";

app.use(cors({
    origin: [
        "http://localhost:5173",
        "http://localhost:5173/"
    ],
    methods: 'GET, POST',
    credentials: true,
}));


server.listen(8000, () => {
    console.log("Server running on port 8000");
})