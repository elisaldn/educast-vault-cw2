const CREATE_URL = "PASTE_CREATE_URL_HERE";
const READ_URL   = "PASTE_READ_URL_HERE";
const UPDATE_URL = "PASTE_UPDATE_URL_HERE";
const DELETE_URL = "PASTE_DELETE_URL_HERE";
// ===============================================

let lastUploadUrl = null;

const out = (msg, obj) => {
  const el = document.getElementById("out");
  if (obj) el.textContent = msg + "\n\n" + JSON.stringify(obj, null, 2);
  else el.textContent = msg;
};

const getFormData = () => {
  const id = document.getElementById("id").value.trim();
  const courseId = document.getElementById("courseId").value.trim();
  const title = document.getElementById("title").value.trim();
  const tagsRaw = document.getElementById("tags").value.trim();
  const tags = tagsRaw ? tagsRaw.split(",").map(t => t.trim()).filter(Boolean) : [];
  const file = document.getElementById("file").files[0] || null;

  if (!id || !courseId) throw new Error("Lecture ID and Course ID are required.");
  return { id, courseId, title, tags, file };
};

document.getElementById("btnCreate").addEventListener("click", async () => {
  try {
    const { id, courseId, title, tags, file } = getFormData();
    const blobName = file ? `${id}-${file.name}` : `${id}.txt`;

    const payload = { id, courseId, title, tags, blobName };

    out("Creating record and generating SAS upload URL...");
    const res = await fetch(CREATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));

    lastUploadUrl = data.uploadUrl;
    out("Created. Save this uploadUrl (also stored in memory). Now click Upload.", data);
  } catch (e) {
    out("ERROR (Create): " + e.message);
  }
});

document.getElementById("btnUpload").addEventListener("click", async () => {
  try {
    const { file } = getFormData();
    if (!file) throw new Error("Choose a file first.");
    if (!lastUploadUrl) throw new Error("No uploadUrl yet. Click Create first.");

    out("Uploading file to Blob via SAS URL...");

    // Upload to Blob using PUT
    const uploadRes = await fetch(lastUploadUrl, {
      method: "PUT",
      headers: { "x-ms-blob-type": "BlockBlob" },
      body: file
    });

    if (!uploadRes.ok) {
      const text = await uploadRes.text();
      throw new Error("Upload failed: " + text);
    }

    out("Upload successful ✅");
  } catch (e) {
    out("ERROR (Upload): " + e.message);
  }
});

document.getElementById("btnRead").addEventListener("click", async () => {
  try {
    const { id, courseId } = getFormData();
    out("Reading record from Cosmos...");
    const url = `${READ_URL}&id=${encodeURIComponent(id)}&courseId=${encodeURIComponent(courseId)}`;
    const res = await fetch(url, { method: "GET" });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    out("Read successful ✅", data);
  } catch (e) {
    out("ERROR (Read): " + e.message);
  }
});

document.getElementById("btnUpdate").addEventListener("click", async () => {
  try {
    const { id, courseId, title, tags } = getFormData();
    out("Updating record in Cosmos...");

    const payload = { id, courseId, title, tags, blobName: `${id}.txt` };

    const res = await fetch(UPDATE_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(JSON.stringify(data));
    out("Update successful ✅", data);
  } catch (e) {
    out("ERROR (Update): " + e.message);
  }
});

document.getElementById("btnDelete").addEventListener("click", async () => {
  try {
    const { id, courseId } = getFormData();
    out("Deleting record + blob...");
    const url = `${DELETE_URL}&id=${encodeURIComponent(id)}&courseId=${encodeURIComponent(courseId)}`;
    const res = await fetch(url, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(JSON.stringify(data));
    out("Delete successful ✅", data);
  } catch (e) {
    out("ERROR (Delete): " + e.message);
  }
});
