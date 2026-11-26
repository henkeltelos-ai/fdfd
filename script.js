// ==========================================================================
// HENKEL TELOS PORTFOLIO — INTERACTIVE MOTION, PHOTO PDF RESUME & FILTERS
// ==========================================================================

// 1. Glassmorphic In-Page Notification Toast
function showToast(message) {
  let toast = document.getElementById("portfolioToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "portfolioToast";
    Object.assign(toast.style, {
      position: "fixed",
      bottom: "24px",
      right: "24px",
      zIndex: "9999",
      background: "rgba(30, 27, 36, 0.92)",
      color: "#ffffff",
      padding: "0.9rem 1.4rem",
      borderRadius: "999px",
      fontSize: "0.9rem",
      fontWeight: "600",
      border: "1px solid rgba(255, 255, 255, 0.25)",
      boxShadow: "0 14px 32px rgba(0, 0, 0, 0.28)",
      backdropFilter: "blur(12px)",
      opacity: "0",
      transform: "translateY(14px)",
      transition: "opacity 0.3s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)"
    });
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  });

  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(14px)";
  }, 3400);
}

// 2. Tactile Radial Click Ripple on Interactive Elements
document.addEventListener("pointerdown", (e) => {
  const target = e.target.closest(".btn, .filter-btn, .nav-links a, .contact-item");
  if (!target) return;

  const rect = target.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const ripple = document.createElement("span");

  ripple.className = "click-ripple";
  ripple.style.width = `${size}px`;
  ripple.style.height = `${size}px`;
  ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
  ripple.style.top = `${e.clientY - rect.top - size / 2}px`;

  target.appendChild(ripple);
  ripple.addEventListener("animationend", () => ripple.remove());
});

// 3. Smooth Page Fade-Out Transition Between Internal HTML Pages
document.querySelectorAll("a[href]").forEach((link) => {
  const href = link.getAttribute("href");
  if (
    !href ||
    href.startsWith("#") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    link.hasAttribute("download") ||
    link.target === "_blank"
  ) {
    return;
  }

  link.addEventListener("click", (e) => {
    e.preventDefault();
    document.body.classList.add("page-leaving");
    setTimeout(() => {
      window.location.href = href;
    }, 280);
  });
});

window.addEventListener("pageshow", () => {
  document.body.classList.remove("page-leaving");
});

// 4. Mobile Navigation Toggle
const menuToggle = document.getElementById("menuToggle");
const navMenu = document.getElementById("navMenu");

if (menuToggle && navMenu) {
  menuToggle.addEventListener("click", () => {
    navMenu.classList.toggle("open");
  });
}

// 5. Helper: Convert 'fvbv.png' (or DOM <img>) into JPEG Bytes for PDF Embedding
function getPortraitJpegBytes(imgSrc, targetW = 240, targetH = 260) {
  return new Promise((resolve) => {
    const existingImg = document.querySelector(".profile-photo");
    const img = new Image();
    img.crossOrigin = "anonymous";

    const processImage = (sourceImg) => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");

        // Fill clean background in case of transparency
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(0, 0, targetW, targetH);

        // Cover-crop centered at top so face & graduation attire frame cleanly
        const srcRatio = sourceImg.naturalWidth / sourceImg.naturalHeight;
        const dstRatio = targetW / targetH;
        let drawW = targetW;
        let drawH = targetH;
        let offsetX = 0;
        let offsetY = 0;

        if (srcRatio > dstRatio) {
          drawW = targetH * srcRatio;
          offsetX = (targetW - drawW) / 2;
        } else {
          drawH = targetW / srcRatio;
          offsetY = 0; // Keep head/top aligned
        }

        ctx.drawImage(sourceImg, offsetX, offsetY, drawW, drawH);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
        const base64 = dataUrl.split(",")[1];
        const raw = atob(base64);
        const bytes = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) {
          bytes[i] = raw.charCodeAt(i);
        }
        resolve({ bytes, width: targetW, height: targetH });
      } catch (err) {
        resolve(null);
      }
    };

    if (existingImg && existingImg.complete && existingImg.naturalWidth > 0) {
      processImage(existingImg);
      return;
    }

    img.onload = () => processImage(img);
    img.onerror = () => resolve(null);
    img.src = imgSrc;
  });
}

// 6. Auto-Aligned Executive PDF Resume Generator (With Embedded Face Photo)
async function generateAndDownloadResumePDF() {
  showToast("Preparing your PDF resume with photo...");

  const portrait = await getPortraitJpegBytes("fvbv.png", 240, 265);

  const pageWidth = 612; // Standard Letter width in pt
  const pageHeight = 792; // Standard Letter height in pt
  const marginX = 48;
  const contentWidth = pageWidth - marginX * 2;
  let cursorY = 742;

  const ops = [];

  const esc = (str) =>
    str
      .replace(/[^\x20-\x7E]/g, "-")
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");

  const drawText = (text, x, y, size = 10, bold = false, r = 0.12, g = 0.16, b = 0.23) => {
    const font = bold ? "/F2" : "/F1";
    ops.push(`BT ${r.toFixed(2)} ${g.toFixed(2)} ${b.toFixed(2)} rg ${font} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${esc(text)}) Tj ET`);
  };

  const drawLine = (x1, y1, x2, y2, width = 1, r = 0.85, g = 0.88, b = 0.92) => {
    ops.push(`q ${width} w ${r.toFixed(2)} ${g.toFixed(2)} ${b.toFixed(2)} RG ${x1} ${y1} m ${x2} ${y2} l S Q`);
  };

  // Word-wrap helper so lines NEVER overflow or collide
  const drawWrappedText = (text, x, maxWidth, size = 9.8, lineHeight = 14, bold = false, r = 0.27, g = 0.33, b = 0.41) => {
    const avgCharWidth = size * 0.51;
    const maxChars = Math.floor(maxWidth / avgCharWidth);
    const words = text.split(" ");
    let currentLine = "";

    words.forEach((word) => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (testLine.length > maxChars && currentLine) {
        drawText(currentLine, x, cursorY, size, bold, r, g, b);
        cursorY -= lineHeight;
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) {
      drawText(currentLine, x, cursorY, size, bold, r, g, b);
      cursorY -= lineHeight;
    }
  };

  const drawSectionHeading = (title) => {
    cursorY -= 8;
    drawText(title.toUpperCase(), marginX, cursorY, 10.5, true, 0.88, 0.21, 0.33);
    cursorY -= 5;
    drawLine(marginX, cursorY, pageWidth - marginX, cursorY, 1.1, 0.88, 0.21, 0.33);
    cursorY -= 15;
  };

  // --- HEADER WITH EMBEDDED PORTRAIT PHOTO ---
  const photoBoxW = 78;
  const photoBoxH = 86;
  const photoX = pageWidth - marginX - photoBoxW;
  const photoY = cursorY - photoBoxH + 14;

  if (portrait) {
    // Draw subtle border around portrait & render image
    ops.push(`q 1.2 w 0.88 0.21 0.33 RG ${photoX - 2} ${photoY - 2} ${photoBoxW + 4} ${photoBoxH + 4} re S Q`);
    ops.push(`q ${photoBoxW} 0 0 ${photoBoxH} ${photoX} ${photoY} cm /Im1 Do Q`);
  }

  const headerTextMaxW = portrait ? contentWidth - photoBoxW - 18 : contentWidth;

  drawText("HENKEL TELOS", marginX, cursorY, 22, true, 0.11, 0.14, 0.2);
  cursorY -= 18;
  drawText("Aspiring Full-Stack Web Developer & BSIT Student", marginX, cursorY, 11, true, 0.88, 0.21, 0.33);
  cursorY -= 16;
  drawWrappedText(
    "Davao City, Philippines  |  henkel.telos@hcdc.edu.ph  |  09317268984",
    marginX,
    headerTextMaxW,
    9.2,
    13,
    false,
    0.3,
    0.35,
    0.42
  );
  drawWrappedText(
    "GitHub: github.com/henkeltelos-ai  |  Holy Cross of Davao College (HCDC)",
    marginX,
    headerTextMaxW,
    9.2,
    13,
    false,
    0.3,
    0.35,
    0.42
  );

  // Ensure cursor clears bottom of photo cleanly
  cursorY = Math.min(cursorY, photoY - 12);
  drawLine(marginX, cursorY, pageWidth - marginX, cursorY, 1.5, 0.15, 0.2, 0.28);
  cursorY -= 12;

  // --- SECTION 1: PROFESSIONAL SUMMARY ---
  drawSectionHeading("Professional Summary");
  drawWrappedText(
    "Detail-oriented Bachelor of Science in Information Technology student at Holy Cross of Davao College with hands-on experience designing responsive web applications, interactive front-end interfaces, and relational database systems. Skilled in turning operational needs into clean, reliable software and seeking an IT or Web Development Internship.",
    marginX,
    contentWidth,
    9.6,
    13.5
  );

  // --- SECTION 2: EDUCATION ---
  drawSectionHeading("Education");
  drawText("Bachelor of Science in Information Technology (BSIT)", marginX, cursorY, 10.2, true);
  drawText("Expected 2027", pageWidth - marginX - 68, cursorY, 9.2, true, 0.4, 0.45, 0.52);
  cursorY -= 14;
  drawText("Holy Cross of Davao College (HCDC) - Sta. Ana Avenue, Davao City", marginX, cursorY, 9.5, false, 0.32, 0.38, 0.46);
  cursorY -= 14;
  drawWrappedText(
    "Relevant Coursework: IT Elective 1 (ADV 101), Web Systems & Technologies, Database Management Systems, Object-Oriented Programming, and System Analysis & Design.",
    marginX,
    contentWidth,
    9.3,
    13
  );

  // --- SECTION 3: TECHNICAL SKILLS ---
  drawSectionHeading("Technical Skills");
  const skillsRows = [
    ["Frontend Engineering:", "HTML5, Semantic Markup, CSS3 (Grid, Flexbox, Animations), JavaScript (ES6+), Responsive UI"],
    ["Backend & Databases:", "PHP, Node.js Fundamentals, MySQL, Relational Database Design, RESTful API Integration"],
    ["Developer Workflow:", "Git & GitHub Version Control, VS Code, Chrome DevTools, Figma UI Prototyping, System Docs"]
  ];

  skillsRows.forEach(([label, items]) => {
    drawText(label, marginX, cursorY, 9.5, true, 0.12, 0.16, 0.23);
    drawWrappedText(items, marginX + 115, contentWidth - 115, 9.4, 13.5);
    cursorY -= 2;
  });

  // --- SECTION 4: PROJECTS SHOWCASE ---
  drawSectionHeading("Academic & Software Projects");

  const projectsList = [
    {
      title: "Personal Multi-Page IT Portfolio Web Application",
      stack: "HTML5, CSS3 Glassmorphism & Keyframe Motion, Vanilla JavaScript",
      desc: "Designed and built a multi-page responsive portfolio featuring spring-physics UI interactions, category filtering, and client-side PDF resume generation."
    },
    {
      title: "HCDC Campus Event Tracker",
      stack: "HTML5, CSS3, JavaScript, LocalStorage",
      desc: "Created a student portal for browsing departmental seminars, registering attendance, and managing event schedules with persistent client storage."
    },
    {
      title: "Barangay Inventory & Equipment Management System",
      stack: "PHP, MySQL, JavaScript, Bootstrap",
      desc: "Developed a CRUD web application to log borrowed community assets, monitor return deadlines, and generate automated stock availability reports."
    }
  ];

  projectsList.forEach((proj) => {
    drawText(proj.title, marginX, cursorY, 10, true, 0.12, 0.16, 0.23);
    cursorY -= 13;
    drawText(`Technologies: ${proj.stack}`, marginX, cursorY, 8.8, true, 0.88, 0.21, 0.33);
    cursorY -= 13;
    drawWrappedText(proj.desc, marginX + 10, contentWidth - 10, 9.3, 13);
    cursorY -= 5;
  });

  // --- ASSEMBLE BINARY PDF (Supports Text Stream + Embedded JPEG XObject) ---
  const encoder = new TextEncoder();
  const contentBytes = encoder.encode(ops.join("\n"));

  const chunks = [];
  const offsets = [0];
  let byteLength = 0;

  const pushStr = (str) => {
    const b = encoder.encode(str);
    chunks.push(b);
    byteLength += b.length;
  };

  const pushBytes = (uint8) => {
    chunks.push(uint8);
    byteLength += uint8.length;
  };

  const startObj = () => {
    offsets.push(byteLength);
  };

  pushStr("%PDF-1.4\n");

  // Obj 1: Catalog
  startObj();
  pushStr("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  // Obj 2: Pages
  startObj();
  pushStr("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

  // Obj 3: Page (with optional /Im1 XObject if portrait loaded)
  startObj();
  const xObjectEntry = portrait ? "/XObject << /Im1 7 0 R >>" : "";
  pushStr(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> ${xObjectEntry} >> /Contents 6 0 R >>\nendobj\n`
  );

  // Obj 4: Helvetica Regular
  startObj();
  pushStr("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n");

  // Obj 5: Helvetica Bold
  startObj();
  pushStr("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n");

  // Obj 6: Page Drawing Stream
  startObj();
  pushStr(`6 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`);
  pushBytes(contentBytes);
  pushStr("\nendstream\nendobj\n");

  // Obj 7: Embedded JPEG Portrait Image (if available)
  if (portrait) {
    startObj();
    pushStr(
      `7 0 obj\n<< /Type /XObject /Subtype /Image /Width ${portrait.width} /Height ${portrait.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${portrait.bytes.length} >>\nstream\n`
    );
    pushBytes(portrait.bytes);
    pushStr("\nendstream\nendobj\n");
  }

  const totalObjs = offsets.length;
  const xrefPos = byteLength;
  pushStr(`xref\n0 ${totalObjs}\n0000000000 65535 f \n`);
  for (let i = 1; i < totalObjs; i++) {
    pushStr(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  }
  pushStr(`trailer\n<< /Size ${totalObjs} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`);

  const finalPdf = new Uint8Array(byteLength);
  let pos = 0;
  chunks.forEach((c) => {
    finalPdf.set(c, pos);
    pos += c.length;
  });

  const blob = new Blob([finalPdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Henkel_Telos_Resume.pdf";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);

  showToast("Downloaded Henkel_Telos_Resume.pdf with your photo!");
}

const downloadResumeBtn = document.getElementById("downloadResumeBtn");
if (downloadResumeBtn) {
  downloadResumeBtn.addEventListener("click", generateAndDownloadResumePDF);
}

// 7. Projects Data & Smooth Animated Filtering (projects.html)
const projectsData = [
  {
    title: "HCDC Campus Event Tracker",
    category: "web",
    description:
      "A responsive web portal that lets students view upcoming departmental seminars, register attendance, and receive schedule updates.",
    technologies: ["HTML5", "CSS3", "JavaScript", "LocalStorage"],
    githubUrl: "https://github.com/henkeltelos-ai",
    liveUrl: "#demo-campus-tracker"
  },
  {
    title: "Barangay Inventory & Equipment System",
    category: "system",
    description:
      "A CRUD web application built to monitor borrowed community equipment, track return deadlines, and generate stock summaries.",
    technologies: ["PHP", "MySQL", "JavaScript", "Bootstrap"],
    githubUrl: "https://github.com/henkeltelos-ai",
    liveUrl: "#demo-barangay-inventory"
  },
  {
    title: "Student Task & Study Planner",
    category: "web",
    description:
      "A lightweight productivity dashboard with subject tagging, priority sorting, and deadline countdowns for college coursework.",
    technologies: ["HTML5", "CSS Grid", "Vanilla JS"],
    githubUrl: "https://github.com/henkeltelos-ai",
    liveUrl: "#demo-task-planner"
  }
];

const projectsGrid = document.getElementById("projectsGrid");
const filterButtons = document.querySelectorAll(".filter-btn");

function renderProjects(filterCategory = "all", animateTransition = false) {
  if (!projectsGrid) return;

  const updateDOM = () => {
    projectsGrid.innerHTML = "";

    const filtered =
      filterCategory === "all"
        ? projectsData
        : projectsData.filter((project) => project.category === filterCategory);

    filtered.forEach((project, index) => {
      const card = document.createElement("article");
      card.className = "project-card";
      card.style.animationDelay = `${index * 0.08}s`;

      const tagsHtml = project.technologies
        .map((tech) => `<span class="tag">${tech}</span>`)
        .join("");

      card.innerHTML = `
        <div>
          <h3>${project.title}</h3>
          <p>${project.description}</p>
          <div class="tech-tags">${tagsHtml}</div>
        </div>
        <div class="project-links">
          <a href="${project.githubUrl}" target="_blank" rel="noopener noreferrer">GitHub Repo →</a>
          <a href="${project.liveUrl}" class="demo-trigger" data-title="${project.title}">Live Demo →</a>
        </div>
      `;

      projectsGrid.appendChild(card);
    });

    projectsGrid.querySelectorAll(".demo-trigger").forEach((demoLink) => {
      demoLink.addEventListener("click", (e) => {
        e.preventDefault();
        showToast(`Previewing "${demoLink.dataset.title}" — check GitHub Repo for full source!`);
      });
    });

    projectsGrid.classList.remove("is-filtering");
  };

  if (animateTransition) {
    projectsGrid.classList.add("is-filtering");
    setTimeout(updateDOM, 200);
  } else {
    updateDOM();
  }
}

if (projectsGrid) {
  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (button.classList.contains("active")) return;
      filterButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      renderProjects(button.dataset.filter, true);
    });
  });

  renderProjects("all", false);
}