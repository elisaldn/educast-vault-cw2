const CREATE_URL = "https://prod-46.uksouth.logic.azure.com/workflows/c94c804a046341269c5dbea382a804d8/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=zjTcyuL3hyxr4sINHre0FMMztT69beN8cVv6L4vBv5k";
const READ_URL   = "https://prod-20.uksouth.logic.azure.com/workflows/e4eb2b6124f74d37a024f850ac85f44c/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=Gse3_9X5BFRbT_P5iwA_-OPtu9RxZQKYl3pAaKlyEY8";
const UPDATE_URL = "https://prod-52.uksouth.logic.azure.com/workflows/c9eef3ed1e0f40eda83605f90f355239/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=i0SajjtiBnAHHynafGf2_dLtgWthmStj0Pwxdz9ceJA";
const DELETE_URL = "https://prod-40.uksouth.logic.azure.com/workflows/63cdda0dca1e453a980a8e7f5cf1edb7/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=kZJ9Fw2yD67vajljIhyq1mnGGMty9WeinqEJ_J-kA_I";

function assertUrl(name, url) {
  if (!url || !url.startsWith("https://")) {
    throw new Error(`${name} is not set correctly. It must start with https://`);
  }
  // Logic App trigger URLs almost always include a signature
  if (!url.includes("sig=")) {
    throw new Error(`${name} looks wrong (missing sig=). Re-copy the trigger URL from Azure Logic App.`);
  }
}

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
