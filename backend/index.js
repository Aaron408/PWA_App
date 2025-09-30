const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001;

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : "*",
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

let tasks = [];

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "TaskTracker API is running",
    tasksCount: tasks.length,
  });
});

app.get("/api/tasks", (req, res) => {
  res.json(tasks);
});

app.post("/api/tasks", (req, res) => {
  try {
    const { title, description, priority = "medium", image, photo } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    //Process image if provided (support both 'image' and 'photo' fields)
    const imageData =
      image || (photo ? { data: photo, type: "image/jpeg" } : null);
    let processedImage = null;
    if (imageData && imageData.data) {
      //Validate image size (max 5MB base64)
      const imageSizeBytes = (imageData.data.length * 3) / 4; //Approximate base64 size
      if (imageSizeBytes > 5 * 1024 * 1024) {
        return res
          .status(400)
          .json({ error: "Image too large. Maximum size is 5MB." });
      }

      processedImage = {
        data: imageData.data.replace(/^data:image\/[a-z]+;base64,/, ""),
        type: imageData.type || "image/jpeg",
      };
    }

    const task = {
      id: Date.now().toString(),
      title,
      description: description || "",
      completed: false,
      priority,
      image: processedImage,
      //Add photo field for compatibility with IndexedDB
      photo: processedImage
        ? `data:image/jpeg;base64,${processedImage.data}`
        : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      synced: true,
    };

    tasks.push(task);
    res.status(201).json(task);
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({ error: "Error creating task" });
  }
});

app.put("/api/tasks/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, completed, priority, image, photo } = req.body;

    const taskIndex = tasks.findIndex((t) => t.id === id);
    if (taskIndex === -1) {
      return res.status(404).json({ error: "Task not found" });
    }

    const existingTask = tasks[taskIndex];

    //Process image if provided (support both 'image' and 'photo' fields)
    const imageData =
      image !== undefined
        ? image
        : photo !== undefined
        ? photo
          ? { data: photo, type: "image/jpeg" }
          : null
        : undefined;
    let processedImage = existingTask.image;
    if (imageData !== undefined) {
      if (imageData === null) {
        processedImage = null;
      } else if (imageData && imageData.data) {
        //Validate image size
        const imageSizeBytes = (imageData.data.length * 3) / 4;
        if (imageSizeBytes > 5 * 1024 * 1024) {
          return res
            .status(400)
            .json({ error: "Image too large. Maximum size is 5MB." });
        }

        processedImage = {
          data: imageData.data.replace(/^data:image\/[a-z]+;base64,/, ""),
          type: imageData.type || "image/jpeg",
        };
      }
    }

    const updatedTask = {
      ...existingTask,
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(completed !== undefined && { completed }),
      ...(priority !== undefined && { priority }),
      image: processedImage,
      //Add photo field for compatibility with IndexedDB
      photo: processedImage
        ? `data:image/jpeg;base64,${processedImage.data}`
        : null,
      updatedAt: new Date().toISOString(),
      synced: true,
    };

    tasks[taskIndex] = updatedTask;
    res.json(updatedTask);
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ error: "Error updating task" });
  }
});

app.delete("/api/tasks/:id", (req, res) => {
  const { id } = req.params;
  const taskIndex = tasks.findIndex((t) => t.id === id);

  if (taskIndex === -1) {
    return res.status(404).json({ error: "Task not found" });
  }

  tasks.splice(taskIndex, 1);
  res.json({ message: "Task deleted successfully" });
});

app.get("/api/stats", (req, res) => {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;

  res.json({
    total,
    completed,
    pending: total - completed,
    highPriority: tasks.filter((t) => t.priority === "high" && !t.completed)
      .length,
  });
});

// Solo iniciar el servidor si este archivo se ejecuta directamente
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 TaskTracker API running on port ${PORT}`);
    console.log("Available endpoints:");
    console.log("- GET /api/health");
    console.log("- GET /api/tasks");
    console.log("- POST /api/tasks");
    console.log("- PUT /api/tasks/:id");
    console.log("- DELETE /api/tasks/:id");
    console.log("- GET /api/stats");
  });
}

module.exports = app;
