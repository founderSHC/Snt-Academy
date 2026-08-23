"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import db from "@/lib/db";
import { createSession, destroySession, getSession } from "@/lib/auth";

async function requireTeacher() {
  const session = await getSession();
  if (!session || session.role !== "teacher") {
    redirect("/login");
  }
  return session;
}

export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");

  if (!username || !password) {
    redirect("/login?error=missing");
  }

  const admin = db
    .prepare("SELECT * FROM admins WHERE username = ?")
    .get(username) as
    | { id: number; username: string; password_hash: string; name: string }
    | undefined;

  if (admin && bcrypt.compareSync(password, admin.password_hash)) {
    await createSession({
      role: "teacher",
      id: admin.id,
      name: admin.name,
      username: admin.username,
    });
    redirect("/teacher");
  }

  const student = db
    .prepare(
      `SELECT s.*, c.name as class_name FROM students s
       JOIN classes c ON c.id = s.class_id
       WHERE s.username = ?`
    )
    .get(username) as
    | {
        id: number;
        username: string;
        password_hash: string;
        name: string;
        class_id: number;
        class_name: string;
      }
    | undefined;

  if (student && bcrypt.compareSync(password, student.password_hash)) {
    await createSession({
      role: "student",
      id: student.id,
      name: student.name,
      username: student.username,
      classId: student.class_id,
      className: student.class_name,
    });
    redirect("/student/announcements");
  }

  redirect("/login?error=invalid");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function changeTeacherPassword(formData: FormData) {
  const session = await requireTeacher();
  const currentPassword = String(formData.get("currentPassword") || "");
  const newPassword = String(formData.get("newPassword") || "");

  const admin = db
    .prepare("SELECT * FROM admins WHERE id = ?")
    .get(session.id) as { id: number; password_hash: string } | undefined;

  if (!admin || !bcrypt.compareSync(currentPassword, admin.password_hash)) {
    redirect("/teacher/settings?error=wrong");
  }
  if (newPassword.length < 6) {
    redirect("/teacher/settings?error=short");
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare("UPDATE admins SET password_hash = ? WHERE id = ?").run(hash, session.id);
  redirect("/teacher/settings?success=1");
}

// ---------- Students ----------

export async function addStudent(formData: FormData) {
  await requireTeacher();
  const name = String(formData.get("name") || "").trim();
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");
  const classId = Number(formData.get("classId"));

  if (!name || !username || !password || !classId) {
    redirect("/teacher/students?error=missing");
  }

  const existing = db.prepare("SELECT id FROM students WHERE username = ?").get(username);
  if (existing) {
    redirect("/teacher/students?error=duplicate");
  }

  const hash = bcrypt.hashSync(password, 10);
  db.prepare(
    "INSERT INTO students (name, username, password_hash, class_id) VALUES (?, ?, ?, ?)"
  ).run(name, username, hash, classId);

  revalidatePath("/teacher/students");
  redirect("/teacher/students?success=added");
}

export async function updateStudent(formData: FormData) {
  await requireTeacher();
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  const username = String(formData.get("username") || "").trim();
  const classId = Number(formData.get("classId"));
  const password = String(formData.get("password") || "");

  if (!id || !name || !username || !classId) {
    redirect("/teacher/students?error=missing");
  }

  const dup = db
    .prepare("SELECT id FROM students WHERE username = ? AND id != ?")
    .get(username, id);
  if (dup) {
    redirect("/teacher/students?error=duplicate");
  }

  if (password) {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare(
      "UPDATE students SET name = ?, username = ?, class_id = ?, password_hash = ? WHERE id = ?"
    ).run(name, username, classId, hash, id);
  } else {
    db.prepare(
      "UPDATE students SET name = ?, username = ?, class_id = ? WHERE id = ?"
    ).run(name, username, classId, id);
  }

  revalidatePath("/teacher/students");
  redirect("/teacher/students?success=updated");
}

export async function deleteStudent(formData: FormData) {
  await requireTeacher();
  const id = Number(formData.get("id"));
  db.prepare("DELETE FROM students WHERE id = ?").run(id);
  revalidatePath("/teacher/students");
  redirect("/teacher/students?success=deleted");
}

// ---------- Announcements ----------

export async function addAnnouncement(formData: FormData) {
  await requireTeacher();
  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  const classIdRaw = String(formData.get("classId") || "");
  const classId = classIdRaw === "all" ? null : Number(classIdRaw);

  if (!title || !body) {
    redirect("/teacher/announcements?error=missing");
  }

  db.prepare("INSERT INTO announcements (title, body, class_id) VALUES (?, ?, ?)").run(
    title,
    body,
    classId
  );

  revalidatePath("/teacher/announcements");
  redirect("/teacher/announcements?success=added");
}

export async function deleteAnnouncement(formData: FormData) {
  await requireTeacher();
  const id = Number(formData.get("id"));
  db.prepare("DELETE FROM announcements WHERE id = ?").run(id);
  revalidatePath("/teacher/announcements");
  redirect("/teacher/announcements?success=deleted");
}

// ---------- Tests & Scores ----------

export async function addTest(formData: FormData) {
  await requireTeacher();
  const classId = Number(formData.get("classId"));
  const title = String(formData.get("title") || "").trim();
  const testDate = String(formData.get("testDate") || "");
  const categoryNames = formData.getAll("categoryName").map((v) => String(v).trim());
  const categoryMaxes = formData.getAll("categoryMax").map((v) => Number(v));
  const categoryThresholds = formData.getAll("categoryRetestThreshold").map((v) => {
    const s = String(v).trim();
    return s === "" ? null : Number(s);
  });
  const categoryCounts = formData.getAll("categoryCountsTowardTotal").map((v) => v === "true");
  const categories = categoryNames
    .map((name, i) => ({
      name,
      max: categoryMaxes[i],
      retestThreshold: categoryThresholds[i] ?? null,
      countsTowardTotal: categoryCounts[i] ?? true,
    }))
    .filter((c) => c.name && Number.isFinite(c.max) && c.max > 0);

  if (!classId || !title || !testDate || categories.length === 0) {
    redirect("/teacher/scores?error=missing");
  }

  const testId = db.transaction(() => {
    const result = db
      .prepare("INSERT INTO tests (class_id, title, test_date) VALUES (?, ?, ?)")
      .run(classId, title, testDate);
    const newTestId = Number(result.lastInsertRowid);
    const insertCategory = db.prepare(
      "INSERT INTO test_categories (test_id, name, max_score, sort_order, retest_threshold, counts_toward_total) VALUES (?, ?, ?, ?, ?, ?)"
    );
    categories.forEach((c, i) =>
      insertCategory.run(newTestId, c.name, c.max, i, c.retestThreshold, c.countsTowardTotal ? 1 : 0)
    );
    return newTestId;
  })();

  revalidatePath("/teacher/scores");
  redirect(`/teacher/scores?classId=${classId}&testId=${testId}&success=testAdded`);
}

export async function deleteTest(formData: FormData) {
  await requireTeacher();
  const id = Number(formData.get("id"));
  const classId = Number(formData.get("classId"));
  db.prepare("DELETE FROM tests WHERE id = ?").run(id);
  revalidatePath("/teacher/scores");
  redirect(`/teacher/scores?classId=${classId}&success=testDeleted`);
}

// ---------- Test categories ----------

export async function addCategory(formData: FormData) {
  await requireTeacher();
  const testId = Number(formData.get("testId"));
  const classId = Number(formData.get("classId"));
  const name = String(formData.get("name") || "").trim();
  const maxScore = Number(formData.get("maxScore"));
  const thresholdRaw = String(formData.get("retestThreshold") || "").trim();
  const retestThreshold = thresholdRaw === "" ? null : Number(thresholdRaw);
  const countsTowardTotal = formData.get("countsTowardTotal") === "on";

  if (!testId || !name || !Number.isFinite(maxScore) || maxScore <= 0) {
    redirect(`/teacher/scores?classId=${classId}&testId=${testId}&error=missing`);
  }

  const nextOrder = db
    .prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 as n FROM test_categories WHERE test_id = ?")
    .get(testId) as { n: number };

  db.prepare(
    "INSERT INTO test_categories (test_id, name, max_score, sort_order, retest_threshold, counts_toward_total) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(testId, name, maxScore, nextOrder.n, retestThreshold, countsTowardTotal ? 1 : 0);

  revalidatePath("/teacher/scores");
  redirect(`/teacher/scores?classId=${classId}&testId=${testId}&success=categoryAdded`);
}

export async function updateCategory(formData: FormData) {
  await requireTeacher();
  const id = Number(formData.get("id"));
  const testId = Number(formData.get("testId"));
  const classId = Number(formData.get("classId"));
  const name = String(formData.get("name") || "").trim();
  const maxScore = Number(formData.get("maxScore"));
  const thresholdRaw = String(formData.get("retestThreshold") || "").trim();
  const retestThreshold = thresholdRaw === "" ? null : Number(thresholdRaw);
  const countsTowardTotal = formData.get("countsTowardTotal") === "on";

  if (!id || !name || !Number.isFinite(maxScore) || maxScore <= 0) {
    redirect(`/teacher/scores?classId=${classId}&testId=${testId}&error=missing`);
  }

  db.prepare(
    "UPDATE test_categories SET name = ?, max_score = ?, retest_threshold = ?, counts_toward_total = ? WHERE id = ?"
  ).run(name, maxScore, retestThreshold, countsTowardTotal ? 1 : 0, id);

  revalidatePath("/teacher/scores");
  redirect(`/teacher/scores?classId=${classId}&testId=${testId}&success=categoryUpdated`);
}

export async function deleteCategory(formData: FormData) {
  await requireTeacher();
  const id = Number(formData.get("id"));
  const testId = Number(formData.get("testId"));
  const classId = Number(formData.get("classId"));
  db.prepare("DELETE FROM test_categories WHERE id = ?").run(id);
  revalidatePath("/teacher/scores");
  redirect(`/teacher/scores?classId=${classId}&testId=${testId}&success=categoryDeleted`);
}

export async function saveScores(formData: FormData) {
  await requireTeacher();
  const testId = Number(formData.get("testId"));
  const classId = Number(formData.get("classId"));
  if (!testId) redirect("/teacher/scores?error=missing");

  const students = db
    .prepare("SELECT id FROM students WHERE class_id = ?")
    .all(classId) as { id: number }[];
  const categories = db
    .prepare("SELECT id FROM test_categories WHERE test_id = ?")
    .all(testId) as { id: number }[];

  const upsert = db.prepare(`
    INSERT INTO scores (test_category_id, student_id, score) VALUES (?, ?, ?)
    ON CONFLICT(test_category_id, student_id) DO UPDATE SET score = excluded.score
  `);
  const remove = db.prepare(
    "DELETE FROM scores WHERE test_category_id = ? AND student_id = ?"
  );

  const tx = db.transaction(() => {
    for (const s of students) {
      for (const cat of categories) {
        const raw = formData.get(`score_${s.id}_${cat.id}`);
        const val = String(raw ?? "").trim();
        if (val === "") {
          remove.run(cat.id, s.id);
        } else {
          const num = Number(val);
          if (!Number.isNaN(num)) {
            upsert.run(cat.id, s.id, num);
          }
        }
      }
    }
  });
  tx();

  revalidatePath("/teacher/scores");
  redirect(`/teacher/scores?classId=${classId}&testId=${testId}&success=scoresSaved`);
}
