// public/runners/sync-worker.js

// 1. Muat JIMP standalone bundle dari folder lokal aplikasi
// Pastikan file dari https://cdn.jsdelivr.net/npm/jimp@0.3.5/browser/lib/jimp.min.js sudah disimpan di folder ini
// importScripts('lib/jimp.min.js');

/**
 * Menghasilkan string Protocol Buffer (pb) untuk inisialisasi pencarian
 */
function generateDynamicPb(lat, lng, zoomLevel = 1, psi = "") {
    // Span: 1km (~24167) atau 2km (~48334)
    const zoomSpan = zoomLevel === 2 ? "48334.94506679693" : "24167.47253339846";

    // Ekstrak bagian depan PSI (Session Key)
    const psiKey = psi.split('.')[0] || "QyBeaYPlIsK7seMPzt-BoA8";

    // Template dasar (Halaman 1 / Offset 0)
    return `!4m9!1m3!1d${zoomSpan}!2d${lng}!3d${lat}!2m0!3m2!1i672!2i585!4f13.1!7i20!10b1!12m26!1m5!18b1!30b1!31m1!1b1!34e1!2m4!5m1!6e2!20e3!39b1!10b1!12b1!13b1!16b1!17m1!3e1!20m4!5e2!6b1!8b1!14b1!46m1!1b0!96b1!99b1!19m4!2m3!1i360!2i120!4i8!20m65!2m2!1i203!2i100!3m2!2i4!5b1!6m6!1m2!1i86!2i86!1m2!1i408!2i240!7m33!1m3!1e1!2b0!3e3!1m3!1e2!2b1!3e2!1m3!1e2!2b0!3e3!1m3!1e8!2b0!3e3!1m3!1e10!2b0!3e3!1m3!1e10!2b1!3e2!1m3!1e10!2b0!3e4!1m3!1e9!2b1!3e2!2b1!9b0!15m16!1m7!1m2!1m1!1e2!2m2!1i195!2i195!3i20!1m7!1m2!1m1!1e2!2m2!1i195!2i195!3i20!22m6!1s${psiKey}:5!2s1i:0,t:11887,p:${psiKey}:5!7e81!12e3!17s${psiKey}:346!18e15!24m109!1m30!13m9!2b1!3b1!4b1!6i1!8b1!9b1!14b1!20b1!25b1!18m19!3b1!4b1!5b1!6b1!9b1!13b1!14b1!17b1!20b1!21b1!22b1!27m1!1b0!28b0!32b1!33m1!1b1!34b1!36e2!10m1!8e3!11m1!3e1!14m1!3b0!17b1!20m2!1e3!1e6!24b1!25b1!26b1!27b1!29b1!30m1!2b1!36b1!37b1!39m3!2m2!2i1!3i1!43b1!52b1!54m1!1b1!55b1!56m1!1b1!61m2!1m1!1e1!65m5!3m4!1m3!1m2!1i224!2i298!72m22!1m8!2b1!5b1!7b1!12m4!1b1!2b1!4m1!1e1!4b1!8m10!1m6!4m1!1e1!4m1!1e3!4m1!1e4!3sother_user_google_review_posts__and__hotel_and_vr_partner_review_posts!6m1!1e1!9b1!89b1!98m3!1b1!2b1!3b1!103b1!113b1!114m3!1b1!2m1!1b1!117b1!122m1!1b1!126b1!127b1!26m4!2m3!1i80!2i92!4i8!30m0!34m19!2b1!3b1!4b1!6b1!8m6!1b1!3b1!4b1!5b1!6b1!7b1!9b1!12b1!14b1!20b1!23b1!25b1!26b1!31b1!37m1!1e81!42b1!47m0!49m10!3b1!6m2!1b1!2b1!7m2!1e3!2b1!8b1!9b1!10e2!50m4!2e2!3m2!1b1!3b1!67m5!7b1!10b1!14b1!15m1!1b0!69i761`;
}

async function decodeLatLong(
    latitude,
    longitude,
    language = 'id',
) {
    let pbTemplate = generateDynamicPb(latitude, longitude, /**zoomSpan**/ 1, "")

    const finalUrl = `https://www.google.com/search?tbm=map&authuser=0&hl=${language}&gl=${language}&q=${encodeURIComponent([latitude, longitude].join(','))}&pb=${pbTemplate}`;

    const options = {
        // url: finalUrl,
        headers: {
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        credentials: "include"
    };

    const response = await fetch(finalUrl, options);
    const googleResponse = await response.text()
    console.log('Google Response:', googleResponse);

    // Extract Google Plus Code and formatted address from the response
    const plusCodePattern = new RegExp(
        `([A-Z0-9]{4}\\+[A-Z0-9]{2,3}\\s[^"<>]+)`,
    );
    const plusCodeMatch = googleResponse.data.match(plusCodePattern);
    console.log('Plus Code Match:', plusCodeMatch);
    if (plusCodeMatch && plusCodeMatch[1]) {
        location.google_plus_code = plusCodeMatch[1].split('\\')[0]; // Remove any escape characters

        // Extract the location name from the Google Plus Code (e.g., "Gambir, Central Jakarta City, Jakarta")
        const locationParts = location.google_plus_code.split(' ');
        if (locationParts.length > 1) {
            locationParts.shift(); // Remove the actual plus code
            location.formatted_address = locationParts.join(' ');
        }
    }

    // If we couldn't extract the formatted address from the Google Plus Code,
    // try to extract it from meta tags
    if (!location.formatted_address) {
        const metaTagPattern =
            /<meta[^>]*content=['"]([^'"]*\d+°\d+&#39;\d+\.\d+"[^'"]*)['"]/;
        const metaTagMatch = googleResponse.match(metaTagPattern);

        if (metaTagMatch && metaTagMatch[1]) {
            location.formatted_address = metaTagMatch[1].replace(/&#39;/g, "'");
        }
    }

    // If we still don't have a formatted address, return null
    if (!location.formatted_address) {
        return null;
    }

    return location;
}
/**
 * Event Listener Utama Background Runner
 * Dipicu saat aplikasi dipindahkan ke latar belakang oleh Vue UI
 */
addEventListener('memicuUploadOffline', async (resolve, reject, args) => {
    try {
        // 2. Periksa status koneksi internet perangkat menggunakan API internal runner v8
        const statusJaringan = await CapacitorDevice.getNetworkStatus();

        if (!statusJaringan.connected) {
            console.log("Runner: Perangkat masih offline, membatalkan pengunggahan.");
            resolve(); // Selesai secara anggun tanpa melempar error ke sistem operasi
            return;
        }

        console.log("Runner: Koneksi internet aktif! Memulai pemrosesan antrean data...");

        // Pastikan data antrean dari SQLite berhasil dioper oleh kode Vue
        if (args && args.antreanData && args.antreanData.length > 0) {

            for (const item of args.antreanData) {
                try {
                    console.log(`Runner: Memproses susulan untuk Resi: ${item.resi}`);

                    let alamatFinal = item.alamat_lengkap;

                    // 3. REVERSE GEOCODING SUSULAN (Jika alamat dikunci dengan status 'PENDING_GEOCODING')
                    if (item.alamat_lengkap === "PENDING_GEOCODING") {
                        try {
                            const resGeocode = await decodeLatLong(item.lokasi_latitude, item.lokasi_longitude, 'id');
                            if (resGeocode && resGeocode.formatted_address) {
                                alamatFinal = resGeocode.formatted_address;
                            } else {
                                alamatFinal = `GPS: ${item.lokasi_latitude.toFixed(6)}, ${item.lokasi_longitude.toFixed(6)}`;
                            }
                        } catch (geoErr) {
                            console.warn("Runner: Gagal reverse geocode, menggunakan koordinat mentah.");
                            alamatFinal = `GPS: ${item.lokasi_latitude.toFixed(6)}, ${item.lokasi_longitude.toFixed(6)}`;
                        }
                    }

                    // 4. PEMBUATAN WATERMARK FISIK DENGAN JIMP (100% AMAN DI BACKGROUND)
                    // Bersihkan header Base64 (data:image/jpeg;base64,) sebelum dikonversi ke buffer biner
                    const cleanBase64 = item.foto_bukti.replace(/^data:image\/[a-z]+;base64,/, "");

                    // JIMP v0.3.5 menerima input instan berupa instansiasi Buffer data biner
                    const imageBuffer = Buffer.from(cleanBase64, 'base64');
                    const image = await Jimp.read(imageBuffer);

                    const canvasWidth = image.bitmap.width;
                    const canvasHeight = image.bitmap.height;

                    // Muat font bitmap bawaan JIMP secara asinkronus (Ukuran 32 ideal untuk resolusi foto HP)
                    const fontJudul = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK); // Untuk baris pertama
                    const fontAlamat = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE); // Untuk baris kedua

                    // Hitung tinggi kotak pelindung hitam di pojok bawah foto
                    const tinggiKotakBlackout = 135;

                    // Gambar bar hitam dengan transparansi Hex 60% (0x000000 = Hitam, 99 = Alpha Opacity)
                    const backgroundBlackout = new Jimp(canvasWidth, tinggiKotakBlackout, 0x00000099);
                    image.composite(backgroundBlackout, 0, canvasHeight - tinggiKotakBlackout);

                    // Logika Pewarnaan Teks Baris Pertama (#fbbf24 Kuning Estetik)
                    // Trik JIMP: Gambar teks di kanvas transparan, lalu lakukan tinting/perubahan kanal RGB
                    const teksKuningImage = new Jimp(canvasWidth, 45, 0x00000000);
                    const waktuAsli = new Date(item.waktu_simpan).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
                    const teksAtas = `Bonang Express | ${waktuAsli}`;

                    teksKuningImage.print(fontJudul, 0, 0, teksAtas);
                    teksKuningImage.color([
                        { apply: 'red', params: [251] },
                        { apply: 'green', params: [191] },
                        { apply: 'blue', params: [36] }
                    ]);

                    // Satukan teks kuning ke baris pertama stempel
                    const startY = canvasHeight - tinggiKotakBlackout + 15;
                    image.composite(teksKuningImage, 25, startY);

                    // Cetak Baris Kedua: Alamat Lengkap Fisik (Mendukung Word-Wrap Otomatis bawaan JIMP)
                    const batasLebarTeks = canvasWidth - 50;
                    const posisiYBaris2 = startY + 45;
                    const teksBawah = `📍 ${alamatFinal}`;

                    image.print(
                        fontAlamat,
                        25,
                        posisiYBaris2,
                        {
                            text: teksBawah,
                            alignmentX: Jimp.HORIZONTAL_ALIGN_LEFT
                        },
                        batasLebarTeks
                    );

                    // Konversi matriks gambar matang kembali menjadi string Base64 Data URL JPEG (Kualitas 85%)
                    image.quality(85);
                    const fotoBerWatermarkMatang = await image.getBase64Async(Jimp.MIME_JPEG);

                    // 5. UNGGAH DATA KE WEB APP SCRIPT / API GOOGLE SHEETS
                    // Ganti URL di bawah dengan Web App URL Google Sheets API Anda
                    const responseUpload = await fetch('https://google.com', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: "updateBuktiPengiriman",
                            row: item.row_sheet,
                            resi: item.resi,
                            foto: fotoBerWatermarkMatang, // Gambar JPEG yang sudah tercetak stempel rapi oleh JIMP
                            alamat: alamatFinal,
                            lat: item.lokasi_latitude,
                            lng: item.lokasi_longitude
                        })
                    });

                    const hasilApi = await responseUpload.json();

                    if (hasilApi && hasilApi.status === "success") {
                        console.log(`Runner: Resi ${item.resi} sukses diunggah ke Google Sheets.`);

                        // PENTING: Untuk menghapus data/mengubah status_upload menjadi 2 di SQLite lokal,
                        // Anda disarankan menggunakan komunikasi callback atau membiarkan Vue membersihkannya 
                        // pada cold-start berikutnya demi menjaga sinkronisasi memori.
                    } else {
                        console.warn(`Runner: Google Sheets menolak data resi ${item.resi}. Ditunda ke sesi berikutnya.`);
                    }

                } catch (itemError) {
                    console.error(`Runner: Gagal memproses baris resi ${item.resi}:`, itemError);
                }
            }

            // 6. KIRIM NOTIFIKASI LOKAL PADA HP KURIR SETELAH SINKRONISASI SELESAI
            await CapacitorNotifications.schedule([{
                id: 9991,
                title: "Sinkronisasi Latar Belakang",
                body: `Berhasil memproses & mengunggah ${args.antreanData.length} foto bukti kirim.`
            }]);
        }

        resolve(); // WAJIB: Selesaikan operasi agar OS melepas pemakaian thread latar belakang
    } catch (globalError) {
        console.error("Runner: Fatal crash pada Background Runner engine:", globalError);
        reject(globalError); // WAJIB: Informasikan kegagalan ke inti sistem operasi ponsel
    }
});
