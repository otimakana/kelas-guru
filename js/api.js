// Unified API service for Teacher Administration Dashboard
// Following CORS bypass rules - All API functions in one place

// Replace with your deployed Google Apps Script web app URL
const API_URL =
  'https://script.google.com/macros/s/AKfycbxsXNa_SLVyp9zio3G7wxoeyU57TPN-rTXQ6_VtOmlNVb4UzSRoP1-emKTLKu54RP3xUQ/exec'

// Generic API function for making requests to the GAS backend
async function callApi(action, params = {}) {
  try {
    // Combine action with other parameters
    const data = {
      action,
      ...params,
    }

    // Create URLSearchParams object (produces application/x-www-form-urlencoded format)
    const formData = new URLSearchParams(data)

    console.log('API calling:', action, 'with params:', params)
    console.log('FormData:', Array.from(formData.entries()))

    // Make fetch request following the CORS rules
    const response = await fetch(API_URL, {
      method: 'POST',
      body: formData,
      // Note: No custom headers to avoid preflight
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    // Parse the JSON response
    const result = await response.json()
    console.log('API Response:', result)
    return result
  } catch (error) {
    console.error('API Error:', error)
    // If fetch fails, try the JSONP approach as fallback
    return await fetchDataWithJSONP(action, params)
  }
}

// Fallback method using JSONP-like approach for CORS issues
async function fetchDataWithJSONP(action, params = {}) {
  return new Promise((resolve) => {
    // Create a unique callback name
    const callbackName = 'jsonpCallback_' + Date.now()

    // Create the full URL with callback parameter
    let url = `${API_URL}?action=${action}&callback=${callbackName}`

    // Add other params to URL
    for (const key in params) {
      if (params.hasOwnProperty(key)) {
        url += `&${key}=${encodeURIComponent(
          typeof params[key] === 'object'
            ? JSON.stringify(params[key])
            : params[key]
        )}`
      }
    }

    // Define the callback function
    window[callbackName] = function (data) {
      // Clean up by removing the script tag and deleting the callback
      document.body.removeChild(script)
      delete window[callbackName]

      // Resolve the promise with the data
      resolve(data)
    }

    // Create script element
    const script = document.createElement('script')
    script.src = url
    script.onerror = function () {
      // Clean up
      document.body.removeChild(script)
      delete window[callbackName]

      // Resolve with error
      resolve({
        success: false,
        error: 'Failed to load data via JSONP',
      })
    }

    // Add script to document to initiate request
    document.body.appendChild(script)
  })
}

// === Authentication API ===
async function login(username, password) {
  return callApi('login', { username, password })
}

// Student login - for student dashboard
async function studentLogin(nis, password) {
  return callApi('studentLogin', { nis, password })
}

// Check if a student is logged in
function checkStudentLogin() {
  const studentData = localStorage.getItem('kelasguru_siswa')
  if (!studentData) {
    // Redirect to student login page if not logged in
    window.location.href = 'siswa-login.html'
    return null
  }

  try {
    return JSON.parse(studentData)
  } catch (e) {
    // If data is corrupted, clear it and redirect
    localStorage.removeItem('kelasguru_siswa')
    window.location.href = 'siswa-login.html'
    return null
  }
}

// Logout student
function logoutStudent() {
  localStorage.removeItem('kelasguru_siswa')
  window.location.href = 'index.html'
}

// === Generic CRUD Operations ===
async function getAllData(entityType) {
  return callApi('get' + entityType)
}

async function getDataById(entityType, id) {
  return callApi('get' + entityType, { id })
}

async function createData(entityType, data) {
  return callApi('create' + entityType, data)
}

async function updateData(entityType, id, data) {
  return callApi('update' + entityType, { id, ...data })
}

async function deleteData(entityType, id) {
  return callApi('delete' + entityType, { id })
}

// === Paginated Data Operations ===
async function getPaginatedData(
  entityType,
  page = 1,
  pageSize = 10,
  filters = {}
) {
  return callApi('get' + entityType, {
    page,
    pageSize,
    ...filters,
    paginated: true,
  })
}

// === Kelas (Class) API ===
async function getKelas(id) {
  return id ? getDataById('Kelas', id) : getAllData('Kelas')
}

async function getPaginatedKelas(page = 1, pageSize = 10, filters = {}) {
  return callApi('getKelas', {
    page,
    pageSize,
    ...filters,
    paginated: true,
  })
}

async function createKelas(kelasData) {
  return createData('Kelas', kelasData)
}

async function updateKelas(id, kelasData) {
  return updateData('Kelas', id, kelasData)
}

async function deleteKelas(id) {
  return deleteData('Kelas', id)
}

// Function to fetch class options for dropdowns
async function fetchClassOptions() {
  try {
    // Get all classes from API
    const response = await getKelas()

    if (response.success && Array.isArray(response.data)) {
      // Return the classes data
      return response.data
    } else {
      console.error(
        'Error fetching classes:',
        response.error || 'Unknown error'
      )
      return []
    }
  } catch (error) {
    console.error('Exception fetching classes:', error)
    return []
  }
}

// === Siswa (Student) API ===
async function getSiswa(id, kelas_id) {
  const params = {}
  if (id) params.id = id
  if (kelas_id) params.kelas_id = kelas_id
  return callApi('getSiswa', params)
}

async function getPaginatedSiswa(page = 1, pageSize = 10, filters = {}) {
  return getPaginatedData('Siswa', page, pageSize, filters)
}

async function createSiswa(siswaData) {
  return createData('Siswa', siswaData)
}

async function updateSiswa(id, siswaData) {
  // Ensure both id formats are included for compatibility
  const params = {
    ...siswaData,
    id: String(id),
    siswa_id: String(id),
  }
  return callApi('updateSiswa', params)
}

async function deleteSiswa(id) {
  // Try both parameter names to ensure compatibility with backend
  return callApi('deleteSiswa', {
    id: String(id),
    siswa_id: String(id),
  })
}

// Get student grades (for student dashboard)
async function getSiswaNilai(siswa_id) {
  try {
    // First try the standard student API approach
    const response = await callApi('getSiswaNilai', { siswa_id })

    // If successful but needs enhancement with status and other fields
    if (response.success && Array.isArray(response.data)) {
      // Get additional details from teacher's API to enhance the data
      try {
        const allGradesResponse = await callApi('getNilai')
        const tugasResponse = await callApi('getTugas') // Get all assignments for better data

        const tugasMap = {}
        if (tugasResponse.success && Array.isArray(tugasResponse.data)) {
          // Create mapping of tugas/assignments by ID for faster lookups
          tugasResponse.data.forEach((tugas) => {
            if (tugas.id) tugasMap[tugas.id] = tugas
          })
        }

        if (
          allGradesResponse.success &&
          Array.isArray(allGradesResponse.data)
        ) {
          const allGrades = allGradesResponse.data

          // Process teacher grades to preserve status field
          const processedGrades = allGrades.map((grade) => {
            if (!grade.status) {
              if (
                grade.nilai === undefined ||
                grade.nilai === null ||
                grade.nilai === ''
              ) {
                grade.status = 'Belum Dikoreksi'
              } else if (Number(grade.nilai) === 0) {
                grade.status = 'Tidak Mengumpulkan'
              } else {
                grade.status = 'Dikoreksi'
              }
            }
            return grade
          })

          // Find all grades for this student
          const studentGrades = processedGrades.filter(
            (grade) => grade.siswa_id === siswa_id
          )

          // Create mapping by grade ID
          const gradesMap = {}
          studentGrades.forEach((grade) => {
            const id = grade.id || grade.nilai_id
            if (id) gradesMap[id] = grade
          })

          // Enhance the student grades with additional fields
          const enhancedGrades = response.data.map((grade) => {
            const gradeId = grade.id
            const fullGradeData = gradesMap[gradeId] || {}

            // Get tugas data for this grade/assignment
            const tugasId = fullGradeData.tugas_id || grade.tugas_id
            const tugasData = tugasMap[tugasId] || {}

            // Prepare enhanced data with proper merging
            const enhancedData = {
              ...grade,
              status: fullGradeData.status || grade.status || 'Belum Dikoreksi',
              komentar: fullGradeData.komentar || grade.komentar || '',
              tanggal:
                fullGradeData.tanggal_penilaian ||
                grade.tanggal_penilaian ||
                grade.created_at ||
                new Date().toISOString(),
            }

            // If there's no nested tugas object yet, create it
            if (!enhancedData.tugas || typeof enhancedData.tugas !== 'object') {
              enhancedData.tugas = {
                id: tugasId,
                judul:
                  tugasData.judul ||
                  fullGradeData.judul ||
                  grade.judul ||
                  'Tugas',
                kategori:
                  tugasData.kategori ||
                  fullGradeData.kategori ||
                  grade.kategori ||
                  'Umum',
                tanggal:
                  tugasData.tanggal ||
                  fullGradeData.tanggal ||
                  grade.tanggal ||
                  new Date().toISOString(),
              }
            } else {
              // If tugas exists, enhance it with more accurate data
              enhancedData.tugas.judul =
                enhancedData.tugas.judul ||
                tugasData.judul ||
                fullGradeData.judul ||
                'Tugas'
              enhancedData.tugas.kategori =
                enhancedData.tugas.kategori ||
                tugasData.kategori ||
                fullGradeData.kategori ||
                'Umum'
              enhancedData.tugas.tanggal =
                enhancedData.tugas.tanggal ||
                tugasData.tanggal ||
                fullGradeData.tanggal ||
                new Date().toISOString()
            }

            return enhancedData
          })

          return {
            success: true,
            data: enhancedGrades,
          }
        }
      } catch (enhanceError) {
        console.warn("Couldn't enhance grades with teacher data:", enhanceError)
      }
    }

    // If we couldn't enhance it, just return the original response
    return response
  } catch (error) {
    console.error('Error getting student grades:', error)
    return { success: false, error: error.message }
  }
}

// Cache for badge data
const cache = {
  badges: null,
  lastFetched: 0,
  cacheLifetime: 60000, // 1 minute cache lifetime
}

// Get student gamification data
async function getSiswaGamification(siswa_id) {
  try {
    // Initialize API calls in parallel
    const gamificationPromise = callApi('getSiswaGamification', { siswa_id })

    // Also fetch XP data to calculate correct XP total (same as leaderboard)
    const xpDataPromise = callApi('getGamifikasiXP', { siswa_id })

    // Start badge data fetch in parallel - check cache first
    let badgesPromise
    const now = Date.now()
    if (!cache.badges || now - cache.lastFetched > cache.cacheLifetime) {
      // Cache expired or doesn't exist - fetch new data
      badgesPromise = callApi('getGamifikasiBadge').then((response) => {
        if (response.success) {
          cache.badges = response.data
          cache.lastFetched = now
        }
        return response
      })
    } else {
      // Use cached data
      badgesPromise = Promise.resolve({ success: true, data: cache.badges })
    }

    // Also fetch student badges in parallel
    const studentBadgesPromise = callApi('getSiswaBadge')

    // Wait for the basic gamification data and XP data
    const [gamificationData, xpResponse] = await Promise.all([
      gamificationPromise,
      xpDataPromise,
    ])

    if (!gamificationData.success) {
      return gamificationData // Return error if basic data fetch failed
    }

    // Calculate XP from XP records (same method as leaderboard)
    let totalXp = 0
    if (xpResponse.success && Array.isArray(xpResponse.data)) {
      // Filter XP records for this student and sum up the values
      const studentXpRecords = xpResponse.data.filter(
        (xp) => xp.siswa_id === siswa_id
      )
      totalXp = studentXpRecords.reduce(
        (sum, xp) => sum + parseInt(xp.jumlah_xp || 0, 10),
        0
      )

      // Override the XP value from the basic gamification response
      gamificationData.data.xp = totalXp
    }

    // Calculate level properly based on XP - ensure consistency
    if (gamificationData.data) {
      const xp = gamificationData.data.xp || 0
      // Use the same calculation as in calculateLevel function
      let level = 1
      if (xp >= 1500) level = 5
      else if (xp >= 700) level = 4
      else if (xp >= 300) level = 3
      else if (xp >= 100) level = 2

      // Override any level from API to ensure consistency
      gamificationData.data.level = level
    }

    // Initialize badges as empty array
    gamificationData.data.badges = []

    // Wait for both badge data and student badges with a timeout
    const results = await Promise.all([badgesPromise, studentBadgesPromise])

    const [badgesResponse, studentBadgesResponse] = results

    // If both succeeded, process badge data
    if (badgesResponse.success && studentBadgesResponse.success) {
      const allBadges = badgesResponse.data || []
      const studentBadgeAssignments = (studentBadgesResponse.data || []).filter(
        (badge) => badge.siswa_id === siswa_id
      )

      if (studentBadgeAssignments.length > 0 && allBadges.length > 0) {
        // Create a map for faster badge lookups
        const badgeMap = {}
        allBadges.forEach((badge) => {
          badgeMap[badge.id] = badge
        })

        // Map student badges to full badge data in one pass
        const badges = studentBadgeAssignments
          .map((assignment) => {
            const badgeDetails = badgeMap[assignment.badge_id]
            if (badgeDetails) {
              return {
                id: assignment.id,
                nama_badge: badgeDetails.nama_badge,
                deskripsi: badgeDetails.deskripsi,
                icon_url: badgeDetails.icon_url,
                xp_reward: badgeDetails.xp_reward,
                tanggal_perolehan: assignment.tanggal_perolehan,
              }
            }
            return null
          })
          .filter((badge) => badge !== null)

        // Add badges to gamification data
        gamificationData.data.badges = badges
      }
    }

    return gamificationData
  } catch (error) {
    console.error('Error getting student gamification data:', error)
    return {
      success: false,
      error:
        error.message || 'An error occurred while getting gamification data',
      data: null,
    }
  }
}

// Get leaderboard data of all students
async function getSiswaLeaderboard() {
  // Use the existing getGamifikasiXP endpoint from teacher API instead
  try {
    const response = await callApi('getGamifikasiXP')
    if (!response.success) {
      return {
        success: false,
        error: response.error || 'Failed to fetch leaderboard data',
      }
    }

    const xpData = response.data || []

    // Process XP data to create leaderboard data
    const studentSummary = {}

    // Aggregate XP points by student
    xpData.forEach((xp) => {
      const studentId = xp.siswa_id
      if (!studentSummary[studentId]) {
        studentSummary[studentId] = {
          id: studentId,
          xp: 0,
          level: 1,
        }
      }

      // Add XP
      studentSummary[studentId].xp += parseInt(xp.jumlah_xp || 0, 10)
    })

    // Fetch student information to add names and classes
    const studentResponse = await callApi('getSiswa')
    if (studentResponse.success && Array.isArray(studentResponse.data)) {
      const students = studentResponse.data

      // Add student names to the summary
      for (const studentId in studentSummary) {
        const student = students.find((s) => s.id === studentId)
        if (student) {
          studentSummary[studentId].nama = student.nama
          studentSummary[studentId].kelas_id = student.kelas_id
        }
      }

      // Fetch class information to add class names
      const classResponse = await callApi('getKelas')
      if (classResponse.success && Array.isArray(classResponse.data)) {
        const classes = classResponse.data
        const classMap = {}

        // Create a map of class IDs to class names
        classes.forEach((cls) => {
          classMap[cls.id] = cls.nama_kelas || cls.nama || `Kelas ${cls.id}`
        })

        // Add class names to the summary
        for (const studentId in studentSummary) {
          const classId = studentSummary[studentId].kelas_id
          if (classId && classMap[classId]) {
            studentSummary[studentId].kelas_nama = classMap[classId]
          } else {
            studentSummary[studentId].kelas_nama = 'Tanpa Kelas'
          }

          // Calculate level based on XP
          const xp = studentSummary[studentId].xp
          let level = 1
          if (xp >= 1500) level = 5
          else if (xp >= 700) level = 4
          else if (xp >= 300) level = 3
          else if (xp >= 100) level = 2

          studentSummary[studentId].level = level
        }
      }
    }

    // Convert summary object to array
    const leaderboardData = Object.values(studentSummary)

    return { success: true, data: leaderboardData }
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return {
      success: false,
      error:
        error.message || 'An error occurred while getting leaderboard data',
    }
  }
}

// === Tugas (Assignment) API ===
async function getTugas(id, kelas_id) {
  const params = {}
  if (id) params.id = id
  if (kelas_id) params.kelas_id = kelas_id
  return callApi('getTugas', params)
}

async function getPaginatedTugas(page = 1, pageSize = 10, filters = {}) {
  return getPaginatedData('Tugas', page, pageSize, filters)
}

async function createTugas(tugasData) {
  return createData('Tugas', tugasData)
}

async function updateTugas(id, tugasData) {
  return updateData('Tugas', id, tugasData)
}

async function deleteTugas(id) {
  return deleteData('Tugas', id)
}

// === Nilai (Grade) API ===
async function getNilai(id, siswa_id, tugas_id) {
  const params = {}
  if (id) params.id = id
  if (siswa_id) params.siswa_id = siswa_id
  if (tugas_id) params.tugas_id = tugas_id
  return callApi('getNilai', params)
}

async function getPaginatedNilai(page = 1, pageSize = 10, filters = {}) {
  return getPaginatedData('Nilai', page, pageSize, filters)
}

async function createNilai(nilaiData) {
  return createData('Nilai', nilaiData)
}

async function updateNilai(id, nilaiData) {
  return updateData('Nilai', id, nilaiData)
}

async function deleteNilai(id) {
  return deleteData('Nilai', id)
}

// === Presensi (Attendance) API ===
async function getPresensi(id, kelas_id, tanggal) {
  const params = {}
  if (id) params.id = id
  if (kelas_id) params.kelas_id = kelas_id
  if (tanggal) params.tanggal = tanggal
  return callApi('getPresensi', params)
}

async function getPaginatedPresensi(page = 1, pageSize = 10, filters = {}) {
  return getPaginatedData('Presensi', page, pageSize, filters)
}

async function createPresensi(presensiData) {
  return createData('Presensi', presensiData)
}

async function updatePresensi(id, presensiData) {
  return updateData('Presensi', id, presensiData)
}

async function deletePresensi(id) {
  return deleteData('Presensi', id)
}

// === Event API ===
async function getEvent(id) {
  return id ? getDataById('Event', id) : getAllData('Event')
}

async function getEvents(params) {
  return getEvent(params)
}

async function getPaginatedEvent(page = 1, pageSize = 10, filters = {}) {
  return getPaginatedData('Event', page, pageSize, filters)
}

async function createEvent(eventData) {
  return createData('Event', eventData)
}

async function updateEvent(id, eventData) {
  return updateData('Event', id, eventData)
}

async function deleteEvent(id) {
  return deleteData('Event', id)
}

// === Jurnal Pembelajaran (Learning Journal) API ===
async function getJurnal(id, kelas_id) {
  const params = {}
  if (id) params.id = id
  if (kelas_id) params.kelas_id = kelas_id
  return callApi('getJurnal', params)
}

async function getPaginatedJurnal(page = 1, pageSize = 10, filters = {}) {
  return getPaginatedData('Jurnal', page, pageSize, filters)
}

async function createJurnal(jurnalData) {
  return createData('Jurnal', jurnalData)
}

async function updateJurnal(id, jurnalData) {
  return updateData('Jurnal', id, jurnalData)
}

async function deleteJurnal(id) {
  return deleteData('Jurnal', id)
}

// === Bank Soal (Question Bank) API ===
async function getBankSoal(id, kategori) {
  const params = {}
  if (id) params.id = id
  if (kategori) params.kategori = kategori
  return callApi('getBankSoal', params)
}

async function getPaginatedBankSoal(page = 1, pageSize = 10, filters = {}) {
  return getPaginatedData('BankSoal', page, pageSize, filters)
}

async function createBankSoal(soalData) {
  return createData('BankSoal', soalData)
}

async function updateBankSoal(id, soalData) {
  return updateData('BankSoal', id, soalData)
}

async function deleteBankSoal(id) {
  return deleteData('BankSoal', id)
}

// === Gamifikasi API ===
async function getGamifikasiXP(siswa_id) {
  const params = {}
  if (siswa_id) params.siswa_id = siswa_id
  return callApi('getGamifikasiXP', params)
}

async function createGamifikasiXP(xpData) {
  return createData('GamifikasiXP', xpData)
}

async function updateGamifikasiXP(id, xpData) {
  return updateData('GamifikasiXP', id, xpData)
}

async function deleteGamifikasiXP(id) {
  return deleteData('GamifikasiXP', id)
}

async function getGamifikasiBadge(id) {
  return id ? getDataById('GamifikasiBadge', id) : getAllData('GamifikasiBadge')
}

async function createGamifikasiBadge(badgeData) {
  return createData('GamifikasiBadge', badgeData)
}

async function updateGamifikasiBadge(id, badgeData) {
  return updateData('GamifikasiBadge', id, badgeData)
}

async function deleteGamifikasiBadge(id) {
  return deleteData('GamifikasiBadge', id)
}

async function getSiswaBadge(siswa_id) {
  const params = {}
  if (siswa_id) params.siswa_id = siswa_id
  return callApi('getSiswaBadge', params)
}

async function createSiswaBadge(badgeData) {
  return createData('SiswaBadge', badgeData)
}

async function updateSiswaBadge(id, badgeData) {
  return updateData('SiswaBadge', id, badgeData)
}

async function deleteSiswaBadge(id) {
  return deleteData('SiswaBadge', id)
}

// === Detail Presensi API ===
async function getDetailPresensi(id, presensi_id, siswa_id) {
  const params = {}
  if (id) params.id = id
  if (presensi_id) params.presensi_id = presensi_id
  if (siswa_id) params.siswa_id = siswa_id
  return callApi('getDetailPresensi', params)
}

async function createDetailPresensi(detailData) {
  return createData('DetailPresensi', detailData)
}

async function updateDetailPresensi(id, detailData) {
  return updateData('DetailPresensi', id, detailData)
}

async function deleteDetailPresensi(id) {
  return deleteData('DetailPresensi', id)
}

// === Legacy Support Functions ===
// Keep old function names for backward compatibility
async function getInventaris() {
  return callApi('getInventaris')
}
