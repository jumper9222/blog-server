let express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();
let { PGHOST, PGDATABASE, PGUSER, PGPASSWORD, ENDPOINT_ID } = process.env;
PGPASSWORD = decodeURIComponent(PGPASSWORD);

let app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
    host: PGHOST,
    database: PGDATABASE,
    username: PGUSER,
    password: PGPASSWORD,
    port: 5432,
    ssl: {
        rejectUnauthorized: false,
    },
});

async function getPostgresVersion() {
    const client = await pool.connect();
    try {
        const res = await client.query("SELECT version()");
        console.log(res.rows[0]);
    } finally {
        client.release();
    }
}

getPostgresVersion();

app.get("/posts/user/:user_id", async (req, res) => {
    const { user_id } = req.params;
    const client = await pool.connect();
    try {
        const posts = await client.query("SELECT * FROM blog_posts WHERE user_id = $1", [user_id]);
        res.json(posts.rows);
    } catch (error) {
        console.error("Error executing query", error.stack);
        res.status(500).json({ error: "Internal Server Error" });
    } finally {
        client.release();
    }
})

app.get("/posts/:post_id", async (req, res) => {
    const { post_id } = req.params;
    const client = await pool.connect();
    try {
        const post = await client.query("SELECT * FROM blog_posts WHERE post_id = $1", [post_id]);
        if (post.rows.length > 0) {
            res.json(post.rows[0]);
        } else {
            res.status(404).json({ error: "Post not found" });
        }
    } catch (error) {
        console.error("Error executing query", error.stack);
        res.status(500).json({ error: "Internal Server Error" });
    } finally {
        client.release();
    }
})

app.put("/posts/:post_id", async (req, res) => {
    const { post_id } = req.params;
    const { title, subtitle, content, userId } = req.body;
    const client = await pool.connect();
    try {
        const post = await client.query(
            "UPDATE blog_posts SET title = $1, subtitle = $2, content = $3 WHERE post_id = $4 AND user_id = $5 RETURNING *",
            [title, subtitle, content, post_id, userId]
        );
        if (post.rows.length > 0) {
            res.json(post.rows[0]);
            console.log({ post: json(post.rows[0]), message: "Post updated successfully." });
        } else {
            res.status(404).json({ error: "Post not found" });
        }
    } catch (error) {
        console.error("Error executing query", error.stack);
        res.status(500).json({ error: "Internal Server Error" });
    } finally {
        client.release();
    }
})

app.post("/posts", async (req, res) => {
    const { userId, title, subtitle, content } = req.body;
    const client = await pool.connect();
    try {
        const userExists = await client.query(
            "SELECT id FROM blog_users WHERE id = $1",
            [userId]
        )

        if (userExists.rows.length > 0) {
            const post = await client.query(
                "INSERT INTO blog_posts (user_id, title, subtitle, content, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING *",
                [userId, title, subtitle, content],
            );
            res.json(post.rows[0]);
        } else {
            res.status(400).json({ error: "User does not exist." });
        }
    } catch (error) {
        console.log("Error executing query", error.stack);
        res
            .status(500)
            .json({ error: "Something went wrong, please try again later!" });
    } finally {
        client.release();
    }
})

app.delete("/posts/:post_id", async (req, res) => {
    const { post_id } = req.params;
    const { userId } = req.body;
    const client = await pool.connect();
    try {
        const post = await client.query("DELETE FROM blog_posts WHERE post_id = $1 AND user_id = $2 RETURNING *", [post_id, userId]);
        if (post.rows.length > 0) {
            res.status(200).json({ post: post.rows[0], message: "Post deleted successfully" });
        } else {
            res.status(404).json({ error: "Post not found" });
        }
    } catch (error) {
        console.error("Error executing query", error.stack);
        res.status(500).json({ error: "Internal Server Error" });
    } finally {
        client.release();
    }
})

app.listen(3000, () => {
    console.log("Server is running on port 3000");
})
