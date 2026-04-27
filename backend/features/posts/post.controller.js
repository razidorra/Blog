import Post from "./post.model.js";

// Alle Blogbeiträge abrufen
export const getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: "Fehler beim Laden der Beiträge" });
  }
};

// Einzelnen Blogbeitrag abrufen
export const getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: "Beitrag nicht gefunden" });
    }
    res.json(post);
  } catch (error) {
    res.status(400).json({ error: "Ungültige Beitrag-ID" });
  }
};

// Neuen Blogbeitrag erstellen
export const createPost = async (req, res) => {
  try {
    const title = req.body.title?.trim();
    const content = req.body.content?.trim();

    if (!title) {
      return res.status(400).json({ error: "Titel ist erforderlich" });
    }
    if (!content) {
      return res.status(400).json({ error: "Inhalt ist erforderlich" });
    }
    if (title.length < 3) {
      return res
        .status(400)
        .json({ error: "Titel muss mindestens 3 Zeichen lang sein" });
    }
    if (content.length < 10) {
      return res
        .status(400)
        .json({ error: "Inhalt muss mindestens 10 Zeichen lang sein" });
    }

    const post = await Post.create({ title, content, author: "Admin" });
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ error: "Fehler beim Erstellen des Beitrags" });
  }
};

// Post löschen
export const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: "Beitrag nicht gefunden" });
    }
    await post.deleteOne();
    res.json({ message: "Beitrag gelöscht" });
  } catch (error) {
    res.status(400).json({ error: "Fehler beim Löschen" });
  }
};

// Post bearbeiten
export const updatePost = async (req, res) => {
  try {
    const title = req.body.title?.trim();
    const content = req.body.content?.trim();

    if (!title) {
      return res.status(400).json({ error: "Titel ist erforderlich" });
    }
    if (!content) {
      return res.status(400).json({ error: "Inhalt ist erforderlich" });
    }

    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { title, content },
      { new: true },
    );

    if (!post) {
      return res.status(404).json({ error: "Beitrag nicht gefunden" });
    }

    res.json(post);
  } catch (error) {
    res.status(400).json({ error: "Fehler beim Bearbeiten" });
  }
};

export const seedPosts = async () => {
  const count = await Post.countDocuments();
  if (count === 0) {
    await Post.insertMany([
      {
        title: "Baluchistan – Ein Volk, durch Gewalt geteilt",
        content:
          "Baluchistan ist ein Volk mit Jahrtausenden von Geschichte, Kultur und Identität. Durch Gewalt und koloniale Entscheidungen wurde es auf drei Teile aufgeteilt: der größte Teil unter Pakistan, ein Teil unter Iran und ein Teil unter Afghanistan. Die Baluchen teilen eine Sprache, eine Kultur und eine Identität – unabhängig von den Grenzen die ihnen aufgezwungen wurden. Der Kampf um Anerkennung und Rechte des baluchischen Volkes dauert bis heute an.",
        author: "Admin",
      },
      {
        title: "Die Kultur und Musik der Baluchen",
        content:
          "Die baluchische Kultur ist reich an Traditionen, Musik und Kunst. Der Sorud, ein traditionelles Musikinstrument, und der Lewa-Tanz sind Symbole der baluchischen Identität. Die handgefertigten Teppiche und Stickereien der baluchischen Frauen sind weltweit bekannt. Gastfreundschaft – auf Baluchi 'Mehman-Nawazi' – ist einer der höchsten Werte in der baluchischen Gesellschaft.",
        author: "Admin",
      },
      {
        title: "Die Natur und Schönheit Baluchistan",
        content:
          "Von der Makran-Küste mit türkisfarbenem Wasser im Süden bis zu den schneebedeckten Bergen im Norden bietet Baluchistan eine unglaubliche Naturvielfalt. Die Hamoun-Seen im iranischen Baluchistan, die Wüste Dasht und der Hingol-Nationalpark in Pakistan gehören zu den beeindruckendsten Landschaften der Region. Diese Schönheit ist leider noch zu wenig von der Welt entdeckt.",
        author: "Admin",
      },
    ]);
    console.log("✅ Baluchistan-Blogbeiträge eingefügt");
  }
};
