// Mengimpor modul yang diperlukan
const chai = require('chai');
const chaiHttp = require('chai-http');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Mengatur Chai untuk membuat permintaan HTTP
chai.use(chaiHttp);
const expect = chai.expect;

// Memuat variabel lingkungan dari file .env
// Menggunakan { override: true } untuk memastikan nilai dari .env menimpa variabel lingkungan yang sudah ada
const dotenvConfig = dotenv.config({ override: true });

if (dotenvConfig.error) {
    console.error('ERROR: Gagal memuat .env file:', dotenvConfig.error);
} else {
    console.log(`DEBUG: .env file berhasil dimuat. Variabel diparse:`, dotenvConfig.parsed);
}

// Konfigurasi dasar API
const BASE_URL = "https://restful-booker.herokuapp.com";

// Variabel untuk menyimpan token dan bookingId antar tes
// Variabel ini akan diisi secara otomatis dari respons API sebelumnya
let authToken = '';
let bookingId = null;
let initialBookingData = {}; // Untuk menyimpan data booking awal yang dikirim

// Memuat data booking dari file JSON
try {
    const bookingDataPath = path.resolve(__dirname, '../booking_data.json');
    console.log(`DEBUG: Mencoba memuat booking_data.json dari: ${bookingDataPath}`);
    initialBookingData = JSON.parse(fs.readFileSync(bookingDataPath, 'utf8'));
    console.log('Data booking berhasil dimuat dari booking_data.json');
} catch (error) {
    console.error('Gagal memuat booking_data.json:', error.message);
    process.exit(1); // Keluar jika file tidak dapat dimuat
}

// Suite pengujian E2E API
// Mengubah fungsi callback describe menjadi fungsi reguler agar 'this' mengacu pada konteks Mocha yang benar
describe('API E2E Testing for Restful Booker', function() { 
    // Meningkatkan batas waktu (timeout) untuk semua tes dalam suite ini menjadi 10 detik (10000ms)
    // Ini membantu mengatasi masalah timeout untuk permintaan API yang mungkin lambat.
    this.timeout(10000); // <-- Batas waktu ditingkatkan menjadi 10 detik

    // Test case untuk mendapatkan token otentikasi
    it('should get an authentication token (API Auth)', (done) => {
        console.log('\n--- Langkah 1: Mendapatkan Token Otentikasi ---');
        const username = process.env.USERNAME;
        const password = process.env.PASSWORD;

        if (!username || !password) {
            console.error('ERROR: Variabel lingkungan USERNAME atau PASSWORD tidak ditemukan.');
            return done(new Error('USERNAME atau PASSWORD tidak diatur di .env'));
        }

        chai.request(BASE_URL)
            .post('/auth')
            .set('Content-Type', 'application/json')
            .send({
                username: username,
                password: password
            })
            .end((err, res) => {
                // Memastikan tidak ada error dari permintaan
                expect(err).to.be.null;
                // Memastikan status code adalah 200 OK
                expect(res).to.have.status(200);
                // Memastikan respons memiliki properti 'token'
                expect(res.body).to.have.property('token');

                // --- SKEMA PENGISIAN OTOMATIS: Token diisi di sini ---
                authToken = res.body.token;
                console.log(`Token berhasil didapatkan dan disimpan: ${authToken.substring(0, 10)}...`);
                done(); // Menyelesaikan tes
            });
    });

    // Test case untuk membuat booking baru
    it('should create a new booking (API CreateBooking)', (done) => {
        console.log('\n--- Langkah 2: Membuat Pemesanan Baru ---');
        chai.request(BASE_URL)
            .post('/booking')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .send(initialBookingData)
            .end((err, res) => {
                // Memastikan tidak ada error dari permintaan
                expect(err).to.be.null;
                // Memastikan status code adalah 200 OK
                expect(res).to.have.status(200);
                // Memastikan respons memiliki properti 'bookingid'
                expect(res.body).to.have.property('bookingid');
                // Memastikan respons memiliki properti 'booking' yang berisi detail booking
                expect(res.body).to.have.property('booking');

                // --- SKEMA PENGISIAN OTOMATIS: bookingId diisi di sini ---
                bookingId = res.body.bookingid;
                const createdBookingDetails = res.body.booking;

                // Memastikan isi body sesuai dengan data yang digunakan saat request
                expect(createdBookingDetails.firstname).to.equal(initialBookingData.firstname);
                expect(createdBookingDetails.lastname).to.equal(initialBookingData.lastname);
                expect(createdBookingDetails.totalprice).to.equal(initialBookingData.totalprice);
                expect(createdBookingDetails.depositpaid).to.equal(initialBookingData.depositpaid);
                expect(createdBookingDetails.bookingdates.checkin).to.equal(initialBookingData.bookingdates.checkin);
                expect(createdBookingDetails.bookingdates.checkout).to.equal(initialBookingData.bookingdates.checkout);
                expect(createdBookingDetails.additionalneeds).to.equal(initialBookingData.additionalneeds);

                console.log(`Pemesanan berhasil dibuat dan bookingId disimpan: ${bookingId}`);
                done();
            });
    });

    // Test case untuk mendapatkan detail booking yang baru dibuat
    it('should get the created booking details (API GetBooking)', (done) => {
        console.log(`\n--- Langkah 3: Memverifikasi Pemesanan dengan bookingId: ${bookingId} ---`);
        // Memastikan bookingId telah didapatkan dari langkah sebelumnya
        // --- SKEMA PENGGUNAAN OTOMATIS: bookingId digunakan di sini ---
        expect(bookingId).to.not.be.null;

        chai.request(BASE_URL)
            .get(`/booking/${bookingId}`)
            .set('Accept', 'application/json')
            .end((err, res) => {
                // Memastikan tidak ada error dari permintaan
                expect(err).to.be.null;
                // Memastikan status code adalah 200 OK
                expect(res).to.have.status(200);

                const retrievedBookingData = res.body;

                // Memastikan isi body sesuai dengan data yang digunakan saat createBooking
                expect(retrievedBookingData.firstname).to.equal(initialBookingData.firstname);
                expect(retrievedBookingData.lastname).to.equal(initialBookingData.lastname);
                expect(retrievedBookingData.totalprice).to.equal(initialBookingData.totalprice);
                expect(retrievedBookingData.depositpaid).to.equal(initialBookingData.depositpaid);
                expect(retrievedBookingData.bookingdates.checkin).to.equal(initialBookingData.bookingdates.checkin);
                expect(retrievedBookingData.bookingdates.checkout).to.equal(initialBookingData.bookingdates.checkout);
                expect(retrievedBookingData.additionalneeds).to.equal(initialBookingData.additionalneeds);

                console.log(`Verifikasi pemesanan ${bookingId} berhasil. Data cocok.`);
                done();
            });
    });

    // Test case untuk menghapus booking yang baru dibuat
    it('should delete the created booking (API DeleteBooking)', (done) => {
        console.log(`\n--- Langkah 4: Menghapus Pemesanan dengan bookingId: ${bookingId} ---`);
        // Memastikan bookingId dan token telah didapatkan dari langkah sebelumnya
        expect(bookingId).to.not.be.null;
        expect(authToken).to.not.be.empty;

        // String Basic Auth yang di-hardcode seperti yang Anda berikan
        const hardcodedBasicAuthString = 'YWRtaW46cGFzc3dvcmQxMjM=';

        chai.request(BASE_URL)
            .delete(`/booking/${bookingId}`)
            .set('Content-Type', 'application/json')
            // Menggunakan header Authorization: Basic yang di-hardcode
            .set('Authorization', `Basic ${hardcodedBasicAuthString}`)
            // Menambahkan header Cookie: token (dari langkah Auth API)
            .set('Cookie', `token=${authToken}`)
            .end((err, res) => {
                // Memastikan tidak ada error dari permintaan
                expect(err).to.be.null;
                // Memastikan status code adalah 201 Created (sesuai dokumentasi untuk DELETE)
                expect(res).to.have.status(201);
                // Memastikan respons body berisi 'Created' atau pesan sukses lainnya
                expect(res.text).to.equal('Created');

                console.log(`Pemesanan ${bookingId} berhasil dihapus.`);
                done();
            });
    });
});
