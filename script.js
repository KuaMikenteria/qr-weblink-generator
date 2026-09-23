/* ==========================================================================
   QR Studio — script.js  (v2: fully self-contained, NO CDN needed)
   Includes an embedded QR Code generator (byte mode, versions 1–40).
   ========================================================================== */

/* ==========================================================================
   1. EMBEDDED QR CODE LIBRARY
   --------------------------------------------------------------------------
   Compact byte-mode QR encoder. No external dependencies.
   Based on the classic MIT-licensed "qrcode-generator" algorithm.
   ========================================================================== */
const qrcode = (function () {
  "use strict";

  /* ---------- Galois field GF(256) ---------- */
  const EXP = new Uint8Array(256);
  const LOG = new Uint8Array(256);
  for (let i = 0; i < 8; i++) EXP[i] = 1 << i;
  for (let i = 8; i < 256; i++)
    EXP[i] = EXP[i - 4] ^ EXP[i - 5] ^ EXP[i - 6] ^ EXP[i - 8];
  for (let i = 0; i < 255; i++) LOG[EXP[i]] = i;

  function gexp(n) {
    while (n < 0) n += 255;
    while (n >= 256) n -= 255;
    return EXP[n];
  }
  function glog(n) {
    if (n < 1) throw new Error("glog(" + n + ")");
    return LOG[n];
  }

  /* ---------- Polynomial over GF(256) ---------- */
  function qrPolynomial(num, shift) {
    let offset = 0;
    while (offset < num.length && num[offset] === 0) offset++;

    const _num = new Array(num.length - offset + shift).fill(0);
    for (let i = 0; i < num.length - offset; i++) _num[i] = num[i + offset];

    return {
      getAt: (index) => _num[index],
      getLength: () => _num.length,
      multiply(e) {
        const out = new Array(this.getLength() + e.getLength() - 1).fill(0);
        for (let i = 0; i < this.getLength(); i++) {
          for (let j = 0; j < e.getLength(); j++) {
            out[i + j] ^= gexp(glog(this.getAt(i)) + glog(e.getAt(j)));
          }
        }
        return qrPolynomial(out, 0);
      },
      mod(e) {
        if (this.getLength() - e.getLength() < 0) return this;
        const ratio = glog(this.getAt(0)) - glog(e.getAt(0));
        const num = new Array(this.getLength()).fill(0);
        for (let i = 0; i < this.getLength(); i++) num[i] = this.getAt(i);
        for (let i = 0; i < e.getLength(); i++) {
          num[i] ^= gexp(glog(e.getAt(i)) + ratio);
        }
        return qrPolynomial(num, 0).mod(e);
      },
    };
  }

  /* ---------- Constants ---------- */
  const MODE_8BIT_BYTE = 1 << 2;
  const ECC = { L: 1, M: 0, Q: 3, H: 2 };

  /* ---------- Alignment pattern positions ---------- */
  const PATTERN_POSITION_TABLE = [
    [],
    [6, 18],
    [6, 22],
    [6, 26],
    [6, 30],
    [6, 34],
    [6, 22, 38],
    [6, 24, 42],
    [6, 26, 46],
    [6, 28, 50],
    [6, 30, 54],
    [6, 32, 58],
    [6, 34, 62],
    [6, 26, 46, 66],
    [6, 26, 48, 70],
    [6, 26, 50, 74],
    [6, 30, 54, 78],
    [6, 30, 56, 82],
    [6, 30, 58, 86],
    [6, 34, 62, 90],
    [6, 28, 50, 72, 94],
    [6, 26, 50, 74, 98],
    [6, 30, 54, 78, 102],
    [6, 28, 54, 80, 106],
    [6, 32, 58, 84, 110],
    [6, 30, 58, 86, 114],
    [6, 34, 62, 90, 118],
    [6, 26, 50, 74, 98, 122],
    [6, 30, 54, 78, 102, 126],
    [6, 26, 52, 78, 104, 130],
    [6, 30, 56, 82, 108, 134],
    [6, 34, 60, 86, 112, 138],
    [6, 30, 58, 86, 114, 142],
    [6, 34, 62, 90, 118, 146],
    [6, 30, 54, 78, 102, 126, 150],
    [6, 24, 50, 76, 102, 128, 154],
    [6, 28, 54, 80, 106, 132, 158],
    [6, 32, 58, 84, 110, 136, 162],
    [6, 26, 54, 82, 110, 138, 166],
    [6, 30, 58, 86, 114, 142, 170],
  ];

  /* ---------- RS Block table (40 versions × 4 ECC levels) ---------- */
  const RS_BLOCK_TABLE = [
    [1, 26, 19],
    [1, 26, 16],
    [1, 26, 13],
    [1, 26, 9],
    [1, 44, 34],
    [1, 44, 28],
    [1, 44, 22],
    [1, 44, 16],
    [1, 70, 55],
    [1, 70, 44],
    [2, 35, 17],
    [2, 35, 13],
    [1, 100, 80],
    [2, 50, 32],
    [2, 50, 24],
    [4, 25, 9],
    [1, 134, 108],
    [2, 67, 43],
    [2, 33, 15, 2, 34, 16],
    [2, 33, 11, 2, 34, 12],
    [2, 86, 68],
    [4, 43, 27],
    [4, 43, 19],
    [4, 43, 15],
    [2, 98, 78],
    [4, 49, 31],
    [2, 32, 14, 4, 33, 15],
    [4, 39, 13, 1, 40, 14],
    [2, 121, 97],
    [2, 60, 38, 2, 61, 39],
    [4, 40, 18, 2, 41, 19],
    [4, 40, 14, 2, 41, 15],
    [2, 146, 116],
    [3, 58, 36, 2, 59, 37],
    [4, 36, 16, 4, 37, 17],
    [4, 36, 12, 4, 37, 13],
    [2, 86, 68, 2, 87, 69],
    [4, 69, 43, 1, 70, 44],
    [6, 43, 19, 2, 44, 20],
    [6, 43, 15, 2, 44, 16],
    [4, 101, 81],
    [1, 80, 50, 4, 81, 51],
    [4, 50, 22, 4, 51, 23],
    [3, 36, 12, 8, 37, 13],
    [2, 116, 92, 2, 117, 93],
    [6, 58, 36, 2, 59, 37],
    [4, 46, 20, 6, 47, 21],
    [7, 42, 14, 4, 43, 15],
    [4, 133, 107],
    [8, 59, 37, 1, 60, 38],
    [8, 44, 20, 4, 45, 21],
    [12, 33, 11, 4, 34, 12],
    [3, 145, 115, 1, 146, 116],
    [4, 64, 40, 5, 65, 41],
    [11, 36, 16, 5, 37, 17],
    [11, 36, 12, 5, 37, 13],
    [5, 109, 87, 1, 110, 88],
    [5, 65, 41, 5, 66, 42],
    [5, 54, 24, 7, 55, 25],
    [11, 36, 12, 7, 37, 13],
    [5, 122, 98, 1, 123, 99],
    [7, 73, 45, 3, 74, 46],
    [15, 43, 19, 2, 44, 20],
    [3, 45, 15, 13, 46, 16],
    [1, 135, 107, 5, 136, 108],
    [10, 74, 46, 1, 75, 47],
    [1, 50, 22, 15, 51, 23],
    [2, 42, 14, 17, 43, 15],
    [5, 150, 120, 1, 151, 121],
    [9, 69, 43, 4, 70, 44],
    [17, 50, 22, 1, 51, 23],
    [2, 42, 14, 19, 43, 15],
    [3, 141, 113, 4, 142, 114],
    [3, 70, 44, 11, 71, 45],
    [17, 47, 21, 4, 48, 22],
    [9, 39, 13, 16, 40, 14],
    [3, 135, 107, 5, 136, 108],
    [3, 67, 41, 13, 68, 42],
    [15, 54, 24, 5, 55, 25],
    [15, 43, 15, 10, 44, 16],
    [4, 144, 116, 4, 145, 117],
    [17, 68, 42],
    [17, 50, 22, 6, 51, 23],
    [19, 46, 16, 6, 47, 17],
    [2, 139, 111, 7, 140, 112],
    [17, 74, 46],
    [7, 54, 24, 16, 55, 25],
    [34, 37, 13],
    [4, 151, 121, 5, 152, 122],
    [4, 75, 47, 14, 76, 48],
    [11, 54, 24, 14, 55, 25],
    [16, 45, 15, 14, 46, 16],
    [6, 147, 117, 4, 148, 118],
    [6, 73, 45, 14, 74, 46],
    [11, 54, 24, 16, 55, 25],
    [30, 46, 16, 2, 47, 17],
    [8, 132, 106, 4, 133, 107],
    [8, 75, 47, 13, 76, 48],
    [7, 54, 24, 22, 55, 25],
    [22, 45, 15, 13, 46, 16],
    [10, 142, 114, 2, 143, 115],
    [19, 74, 46, 4, 75, 47],
    [28, 50, 22, 6, 51, 23],
    [33, 46, 16, 4, 47, 17],
    [8, 152, 122, 4, 153, 123],
    [22, 73, 45, 3, 74, 46],
    [8, 53, 23, 26, 54, 24],
    [12, 45, 15, 28, 46, 16],
    [3, 147, 117, 10, 148, 118],
    [3, 73, 45, 23, 74, 46],
    [4, 54, 24, 31, 55, 25],
    [11, 45, 15, 31, 46, 16],
    [7, 146, 116, 7, 147, 117],
    [21, 73, 45, 7, 74, 46],
    [1, 53, 23, 37, 54, 24],
    [19, 45, 15, 26, 46, 16],
    [5, 145, 115, 10, 146, 116],
    [19, 75, 47, 10, 76, 48],
    [15, 54, 24, 25, 55, 25],
    [23, 45, 15, 25, 46, 16],
    [13, 145, 115, 3, 146, 116],
    [2, 74, 46, 29, 75, 47],
    [42, 54, 24, 1, 55, 25],
    [23, 45, 15, 28, 46, 16],
    [17, 145, 115],
    [10, 74, 46, 23, 75, 47],
    [10, 54, 24, 35, 55, 25],
    [19, 45, 15, 35, 46, 16],
    [17, 145, 115, 1, 146, 116],
    [14, 74, 46, 21, 75, 47],
    [29, 54, 24, 19, 55, 25],
    [11, 45, 15, 46, 46, 16],
    [13, 145, 115, 6, 146, 116],
    [14, 74, 46, 23, 75, 47],
    [44, 54, 24, 7, 55, 25],
    [59, 46, 16, 1, 47, 17],
    [12, 151, 121, 7, 152, 122],
    [12, 75, 47, 26, 76, 48],
    [39, 54, 24, 14, 55, 25],
    [22, 45, 15, 41, 46, 16],
    [6, 151, 121, 14, 152, 122],
    [6, 75, 47, 34, 76, 48],
    [46, 54, 24, 10, 55, 25],
    [2, 45, 15, 64, 46, 16],
    [17, 152, 122, 4, 153, 123],
    [29, 74, 46, 14, 75, 47],
    [49, 54, 24, 10, 55, 25],
    [24, 45, 15, 46, 46, 16],
    [4, 152, 122, 18, 153, 123],
    [13, 74, 46, 32, 75, 47],
    [48, 54, 24, 14, 55, 25],
    [42, 45, 15, 32, 46, 16],
    [20, 147, 117, 4, 148, 118],
    [40, 75, 47, 7, 76, 48],
    [43, 54, 24, 22, 55, 25],
    [10, 45, 15, 67, 46, 16],
    [19, 148, 118, 6, 149, 119],
    [18, 75, 47, 31, 76, 48],
    [34, 54, 24, 34, 55, 25],
    [20, 45, 15, 61, 46, 16],
  ];

  /* ---------- BCH for format / version info ---------- */
  const G15 =
    (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | 1;
  const G18 =
    (1 << 12) |
    (1 << 11) |
    (1 << 10) |
    (1 << 9) |
    (1 << 8) |
    (1 << 5) |
    (1 << 2) |
    1;
  const G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);

  function bchDigit(data) {
    let digit = 0;
    while (data !== 0) {
      digit++;
      data >>>= 1;
    }
    return digit;
  }
  function bchTypeInfo(data) {
    let d = data << 10;
    while (bchDigit(d) - bchDigit(G15) >= 0)
      d ^= G15 << (bchDigit(d) - bchDigit(G15));
    return ((data << 10) | d) ^ G15_MASK;
  }
  function bchTypeNumber(data) {
    let d = data << 12;
    while (bchDigit(d) - bchDigit(G18) >= 0)
      d ^= G18 << (bchDigit(d) - bchDigit(G18));
    return (data << 12) | d;
  }

  /* ---------- Bit buffer ---------- */
  function BitBuffer() {
    this.buffer = [];
    this.length = 0;
  }
  BitBuffer.prototype = {
    getLengthInBits() {
      return this.length;
    },
    put(num, length) {
      for (let i = 0; i < length; i++)
        this.putBit(((num >>> (length - i - 1)) & 1) === 1);
    },
    putBit(bit) {
      const idx = Math.floor(this.length / 8);
      if (this.buffer.length <= idx) this.buffer.push(0);
      if (bit) this.buffer[idx] |= 0x80 >>> (this.length % 8);
      this.length++;
    },
  };

  /* ---------- Length (in bits) for byte mode ---------- */
  function lengthInBits(mode, type) {
    if (mode !== MODE_8BIT_BYTE) throw new Error("mode " + mode);
    return type < 10 ? 8 : 16;
  }

  /* ---------- RS Block helpers ---------- */
  function getRsBlockTable(typeNumber, eccLevel) {
    const offset =
      eccLevel === ECC.L
        ? 0
        : eccLevel === ECC.M
          ? 1
          : eccLevel === ECC.Q
            ? 2
            : 3;
    return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + offset];
  }
  function getRSBlocks(typeNumber, eccLevel) {
    const rsBlock = getRsBlockTable(typeNumber, eccLevel);
    if (!rsBlock)
      throw new Error("bad rs block @ v" + typeNumber + "/ecc" + eccLevel);
    const list = [];
    const length = rsBlock.length / 3;
    for (let i = 0; i < length; i++) {
      const count = rsBlock[i * 3 + 0];
      const total = rsBlock[i * 3 + 1];
      const data = rsBlock[i * 3 + 2];
      for (let j = 0; j < count; j++)
        list.push({ totalCount: total, dataCount: data });
    }
    return list;
  }

  /* ---------- Byte-mode data writer (UTF-8) ---------- */
  function QR8bitByte(data) {
    this.mode = MODE_8BIT_BYTE;
    this.bytes = [];
    for (let i = 0; i < data.length; i++) {
      const code = data.charCodeAt(i);
      if (code < 0x80) {
        this.bytes.push(code);
      } else if (code < 0x800) {
        this.bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
      } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < data.length) {
        const next = data.charCodeAt(i + 1);
        if (next >= 0xdc00 && next <= 0xdfff) {
          const cp = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
          this.bytes.push(
            0xf0 | (cp >> 18),
            0x80 | ((cp >> 12) & 0x3f),
            0x80 | ((cp >> 6) & 0x3f),
            0x80 | (cp & 0x3f),
          );
          i++;
        } else {
          this.bytes.push(
            0xe0 | (code >> 12),
            0x80 | ((code >> 6) & 0x3f),
            0x80 | (code & 0x3f),
          );
        }
      } else {
        this.bytes.push(
          0xe0 | (code >> 12),
          0x80 | ((code >> 6) & 0x3f),
          0x80 | (code & 0x3f),
        );
      }
    }
  }
  QR8bitByte.prototype = {
    getLength() {
      return this.bytes.length;
    },
    write(buffer) {
      for (let i = 0; i < this.bytes.length; i++) buffer.put(this.bytes[i], 8);
    },
  };

  /* ---------- Mask functions ---------- */
  function getMask(pattern, i, j) {
    switch (pattern) {
      case 0:
        return (i + j) % 2 === 0;
      case 1:
        return i % 2 === 0;
      case 2:
        return j % 3 === 0;
      case 3:
        return (i + j) % 3 === 0;
      case 4:
        return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
      case 5:
        return ((i * j) % 2) + ((i * j) % 3) === 0;
      case 6:
        return (((i * j) % 2) + ((i * j) % 3)) % 2 === 0;
      case 7:
        return (((i * j) % 3) + ((i + j) % 2)) % 2 === 0;
    }
  }

  /* ---------- Lost-point heuristic for mask selection ---------- */
  function getLostPoint(qr) {
    const n = qr.moduleCount;
    let lost = 0;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        let same = 0;
        const dark = qr.modules[r][c];
        for (let dr = -1; dr <= 1; dr++) {
          if (r + dr < 0 || r + dr >= n) continue;
          for (let dc = -1; dc <= 1; dc++) {
            if (c + dc < 0 || c + dc >= n) continue;
            if (dr === 0 && dc === 0) continue;
            if (dark === qr.modules[r + dr][c + dc]) same++;
          }
        }
        if (same > 5) lost += 3 + same - 5;
      }
    }
    for (let r = 0; r < n - 1; r++) {
      for (let c = 0; c < n - 1; c++) {
        let count = 0;
        if (qr.modules[r][c]) count++;
        if (qr.modules[r + 1][c]) count++;
        if (qr.modules[r][c + 1]) count++;
        if (qr.modules[r + 1][c + 1]) count++;
        if (count === 0 || count === 4) lost += 3;
      }
    }
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n - 6; c++) {
        if (
          qr.modules[r][c] &&
          !qr.modules[r][c + 1] &&
          qr.modules[r][c + 2] &&
          qr.modules[r][c + 3] &&
          qr.modules[r][c + 4] &&
          !qr.modules[r][c + 5] &&
          qr.modules[r][c + 6]
        )
          lost += 40;
      }
    }
    for (let c = 0; c < n; c++) {
      for (let r = 0; r < n - 6; r++) {
        if (
          qr.modules[r][c] &&
          !qr.modules[r + 1][c] &&
          qr.modules[r + 2][c] &&
          qr.modules[r + 3][c] &&
          qr.modules[r + 4][c] &&
          !qr.modules[r + 5][c] &&
          qr.modules[r + 6][c]
        )
          lost += 40;
      }
    }
    let darkCount = 0;
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++) if (qr.modules[r][c]) darkCount++;
    lost += (Math.abs((100 * darkCount) / n / n - 50) / 5) * 10;
    return lost;
  }

  /* ---------- Core QRCode class ---------- */
  function QRCode(typeNumber, errorCorrectLevel) {
    this.typeNumber = typeNumber;
    this.errorCorrectLevel = errorCorrectLevel;
    this.modules = null;
    this.moduleCount = 0;
    this.dataCache = null;
    this.dataList = [];
  }

  QRCode.prototype = {
    addData(data) {
      this.dataList.push(new QR8bitByte(data));
      this.dataCache = null;
    },

    isDark(row, col) {
      if (
        row < 0 ||
        this.moduleCount <= row ||
        col < 0 ||
        this.moduleCount <= col
      ) {
        throw new Error(row + "," + col);
      }
      return this.modules[row][col];
    },
    getModuleCount() {
      return this.moduleCount;
    },

    make() {
      this.makeImpl(false, this.getBestMaskPattern());
    },

    makeImpl(test, maskPattern) {
      this.moduleCount = this.typeNumber * 4 + 17;
      this.modules = [];
      for (let r = 0; r < this.moduleCount; r++)
        this.modules.push(new Array(this.moduleCount).fill(null));

      this.setupPositionProbePattern(0, 0);
      this.setupPositionProbePattern(this.moduleCount - 7, 0);
      this.setupPositionProbePattern(0, this.moduleCount - 7);
      this.setupPositionAdjustPattern();
      this.setupTimingPattern();
      this.setupTypeInfo(test, maskPattern);
      if (this.typeNumber >= 7) this.setupTypeNumber(test);
      if (this.dataCache == null)
        this.dataCache = QRCode.createData(
          this.typeNumber,
          this.errorCorrectLevel,
          this.dataList,
        );
      this.mapData(this.dataCache, maskPattern);
    },

    setupPositionProbePattern(row, col) {
      for (let r = -1; r <= 7; r++) {
        if (row + r <= -1 || this.moduleCount <= row + r) continue;
        for (let c = -1; c <= 7; c++) {
          if (col + c <= -1 || this.moduleCount <= col + c) continue;
          this.modules[row + r][col + c] =
            (0 <= r && r <= 6 && (c === 0 || c === 6)) ||
            (0 <= c && c <= 6 && (r === 0 || r === 6)) ||
            (2 <= r && r <= 4 && 2 <= c && c <= 4);
        }
      }
    },

    getBestMaskPattern() {
      let min = 0,
        pattern = 0;
      for (let i = 0; i < 8; i++) {
        this.makeImpl(true, i);
        const lost = getLostPoint(this);
        if (i === 0 || min > lost) {
          min = lost;
          pattern = i;
        }
      }
      return pattern;
    },

    setupTimingPattern() {
      for (let r = 8; r < this.moduleCount - 8; r++) {
        if (this.modules[r][6] != null) continue;
        this.modules[r][6] = r % 2 === 0;
      }
      for (let c = 8; c < this.moduleCount - 8; c++) {
        if (this.modules[6][c] != null) continue;
        this.modules[6][c] = c % 2 === 0;
      }
    },

    setupPositionAdjustPattern() {
      const pos = PATTERN_POSITION_TABLE[this.typeNumber - 1];
      for (let i = 0; i < pos.length; i++) {
        for (let j = 0; j < pos.length; j++) {
          const row = pos[i],
            col = pos[j];
          if (this.modules[row][col] != null) continue;
          for (let r = -2; r <= 2; r++) {
            for (let c = -2; c <= 2; c++) {
              this.modules[row + r][col + c] =
                r === -2 ||
                r === 2 ||
                c === -2 ||
                c === 2 ||
                (r === 0 && c === 0);
            }
          }
        }
      }
    },

    setupTypeNumber(test) {
      const bits = bchTypeNumber(this.typeNumber);
      for (let i = 0; i < 18; i++) {
        const mod = !test && ((bits >> i) & 1) === 1;
        this.modules[Math.floor(i / 3)][(i % 3) + this.moduleCount - 8 - 3] =
          mod;
      }
      for (let i = 0; i < 18; i++) {
        const mod = !test && ((bits >> i) & 1) === 1;
        this.modules[(i % 3) + this.moduleCount - 8 - 3][Math.floor(i / 3)] =
          mod;
      }
    },

    setupTypeInfo(test, maskPattern) {
      const data = (this.errorCorrectLevel << 3) | maskPattern;
      const bits = bchTypeInfo(data);
      for (let i = 0; i < 15; i++) {
        const mod = !test && ((bits >> i) & 1) === 1;
        if (i < 6) this.modules[i][8] = mod;
        else if (i < 8) this.modules[i + 1][8] = mod;
        else this.modules[this.moduleCount - 15 + i][8] = mod;
      }
      for (let i = 0; i < 15; i++) {
        const mod = !test && ((bits >> i) & 1) === 1;
        if (i < 8) this.modules[8][this.moduleCount - i - 1] = mod;
        else if (i < 9) this.modules[8][15 - i - 1 + 1] = mod;
        else this.modules[8][15 - i - 1] = mod;
      }
      this.modules[this.moduleCount - 8][8] = !test;
    },

    mapData(data, maskPattern) {
      let inc = -1;
      let row = this.moduleCount - 1;
      let bitIndex = 7;
      let byteIndex = 0;
      for (let col = this.moduleCount - 1; col > 0; col -= 2) {
        if (col === 6) col--;
        while (true) {
          for (let c = 0; c < 2; c++) {
            if (this.modules[row][col - c] == null) {
              let dark = false;
              if (byteIndex < data.length)
                dark = ((data[byteIndex] >>> bitIndex) & 1) === 1;
              if (getMask(maskPattern, row, col - c)) dark = !dark;
              this.modules[row][col - c] = dark;
              bitIndex--;
              if (bitIndex === -1) {
                byteIndex++;
                bitIndex = 7;
              }
            }
          }
          row += inc;
          if (row < 0 || this.moduleCount <= row) {
            row -= inc;
            inc = -inc;
            break;
          }
        }
      }
    },
  };

  QRCode.PAD0 = 0xec;
  QRCode.PAD1 = 0x11;

  QRCode.createData = function (typeNumber, eccLevel, dataList) {
    const rsBlocks = getRSBlocks(typeNumber, eccLevel);
    const buffer = new BitBuffer();

    for (let i = 0; i < dataList.length; i++) {
      const data = dataList[i];
      buffer.put(data.mode, 4);
      buffer.put(data.getLength(), lengthInBits(data.mode, typeNumber));
      data.write(buffer);
    }

    let totalDataCount = 0;
    for (let i = 0; i < rsBlocks.length; i++)
      totalDataCount += rsBlocks[i].dataCount;

    if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) buffer.put(0, 4);
    while (buffer.getLengthInBits() % 8 !== 0) buffer.putBit(false);
    while (true) {
      if (buffer.getLengthInBits() >= totalDataCount * 8) break;
      buffer.put(QRCode.PAD0, 8);
      if (buffer.getLengthInBits() >= totalDataCount * 8) break;
      buffer.put(QRCode.PAD1, 8);
    }

    return QRCode.createBytes(buffer, rsBlocks);
  };

  QRCode.createBytes = function (buffer, rsBlocks) {
    let offset = 0;
    let maxDcCount = 0,
      maxEcCount = 0;
    const dcdata = new Array(rsBlocks.length);
    const ecdata = new Array(rsBlocks.length);

    for (let r = 0; r < rsBlocks.length; r++) {
      const dcCount = rsBlocks[r].dataCount;
      const ecCount = rsBlocks[r].totalCount - dcCount;
      maxDcCount = Math.max(maxDcCount, dcCount);
      maxEcCount = Math.max(maxEcCount, ecCount);

      dcdata[r] = new Array(dcCount);
      for (let i = 0; i < dcCount; i++)
        dcdata[r][i] = 0xff & buffer.buffer[i + offset];
      offset += dcCount;

      /* Generate RS generator polynomial of degree ecCount */
      let rsPoly = qrPolynomial([1], 0);
      for (let i = 0; i < ecCount; i++)
        rsPoly = rsPoly.multiply(qrPolynomial([1, gexp(i)], 0));

      const rawPoly = qrPolynomial(dcdata[r], rsPoly.getLength() - 1);
      const modPoly = rawPoly.mod(rsPoly);

      ecdata[r] = new Array(rsPoly.getLength() - 1);
      for (let i = 0; i < ecdata[r].length; i++) {
        const modIndex = i + modPoly.getLength() - ecdata[r].length;
        ecdata[r][i] = modIndex >= 0 ? modPoly.getAt(modIndex) : 0;
      }
    }

    let totalCodeCount = 0;
    for (let i = 0; i < rsBlocks.length; i++)
      totalCodeCount += rsBlocks[i].totalCount;

    const data = new Array(totalCodeCount);
    let index = 0;
    for (let i = 0; i < maxDcCount; i++) {
      for (let r = 0; r < rsBlocks.length; r++) {
        if (i < dcdata[r].length) data[index++] = dcdata[r][i];
      }
    }
    for (let i = 0; i < maxEcCount; i++) {
      for (let r = 0; r < rsBlocks.length; r++) {
        if (i < ecdata[r].length) data[index++] = ecdata[r][i];
      }
    }
    return data;
  };

  /* ---------- Public factory ---------- */
  function factory(typeNumber, errorCorrectLevel) {
    return new QRCode(typeNumber, errorCorrectLevel);
  }
  factory.stringToBytes = function (s) {
    return Array.from(s).map((ch) => ch.charCodeAt(0));
  };

  /* ---------- Helper: choose smallest version that fits ---------- */
  factory.getTypeNumber = function (byteLength, eccLevel) {
    for (let type = 1; type <= 40; type++) {
      const rsBlocks = getRSBlocks(type, eccLevel);
      let totalDataCount = 0;
      for (let i = 0; i < rsBlocks.length; i++)
        totalDataCount += rsBlocks[i].dataCount;
      const totalBits = totalDataCount * 8;
      const lenBits = type < 10 ? 8 : 16;
      const needed = 4 + lenBits + byteLength * 8;
      if (needed <= totalBits) return type;
    }
    return -1;
  };

  factory.ECC = ECC;
  return factory;
})();

/* ==========================================================================
   2. MAIN APP
   ========================================================================== */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const root = document.documentElement;
  const form = $("qrForm");
  const input = $("urlInput");
  const clearBtn = $("clearBtn");
  const pasteBtn = $("pasteBtn");
  const errorMsg = $("errorMsg");
  const canvas = $("qrCanvas");
  const placeholder = $("qrPlaceholder");
  const actions = $("actions");
  const scanHint = $("scanHint");
  const scanUrl = $("scanUrl");
  const downloadBtn = $("downloadBtn");
  const copyBtn = $("copyBtn");
  const openBtn = $("openBtn");
  const toastEl = $("toast");
  const themeToggle = $("themeToggle");
  const yearEl = $("year");

  const MAX_LENGTH = 1800;
  const QR_SIZE = 1024;
  const THEME_KEY = "qrstudio:theme";

  const state = { url: "", fileName: "qr-code" };

  let typeTimer = null;
  let toastTimer = null;
  let renderToken = 0;

  /* ---------- URL helpers ---------- */
  function normalizeUrl(raw) {
    const value = (raw || "").trim();
    if (!value) return { ok: false, empty: true };
    if (value.length > MAX_LENGTH)
      return {
        ok: false,
        message: `That link is too long. Keep it under ${MAX_LENGTH} characters.`,
      };

    let candidate = value;
    if (!/^[a-z][a-z0-9+.-]*:/i.test(candidate))
      candidate = "https://" + candidate;

    let parsed;
    try {
      parsed = new URL(candidate);
    } catch {
      return {
        ok: false,
        message:
          "That doesn’t look like a valid link. Try something like https://example.com",
      };
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return {
        ok: false,
        message:
          "Only http:// and https:// links can be turned into a QR code.",
      };
    }
    if (!parsed.hostname)
      return {
        ok: false,
        message: "Please include a website address, e.g. https://example.com",
      };

    return { ok: true, url: parsed.href };
  }

  function prettyLink(url) {
    try {
      const u = new URL(url);
      const path = u.pathname === "/" ? "" : u.pathname;
      return u.hostname.replace(/^www\./, "") + path + u.search;
    } catch {
      return url;
    }
  }

  function safeFileName(url) {
    try {
      const host = new URL(url).hostname.replace(/^www\./, "");
      return "qr-code-" + host.replace(/[^a-z0-9.-]/gi, "-");
    } catch {
      return "qr-code";
    }
  }

  function utf8ByteLength(str) {
    let len = 0;
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      if (c < 0x80) len += 1;
      else if (c < 0x800) len += 2;
      else if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
        len += 4;
        i++;
      } else len += 3;
    }
    return len;
  }

  /* ---------- UI helpers ---------- */
  function showError(message) {
    errorMsg.textContent = message;
    errorMsg.hidden = false;
  }
  function hideError() {
    errorMsg.hidden = true;
    errorMsg.textContent = "";
  }

  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2400);
  }

  function resetPreview() {
    state.url = "";
    canvas.hidden = true;
    placeholder.hidden = false;
    actions.hidden = true;
    scanHint.hidden = true;
    openBtn.href = "#";
  }

  function showPreview(url) {
    state.url = url;
    state.fileName = safeFileName(url);
    placeholder.hidden = true;
    canvas.hidden = false;
    actions.hidden = false;
    scanHint.hidden = false;
    scanUrl.textContent = prettyLink(url);
    openBtn.href = url;
  }

  /* ---------- Draw QR onto canvas ---------- */
  function drawQR(url) {
    const eccLevel = qrcode.ECC.M;
    const byteLen = utf8ByteLength(url);
    const typeNumber = qrcode.getTypeNumber(byteLen, eccLevel);

    if (typeNumber < 0) throw new Error("Data too long for a QR code");

    const qr = qrcode(typeNumber, eccLevel);
    qr.addData(url);
    qr.make();

    const count = qr.getModuleCount();
    const margin = 4;
    const totalModules = count + margin * 2;
    const scale = canvas.width / totalModules;

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#0f172a";
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (qr.isDark(r, c)) {
          const x0 = Math.round((c + margin) * scale);
          const y0 = Math.round((r + margin) * scale);
          const x1 = Math.round((c + margin + 1) * scale);
          const y1 = Math.round((r + margin + 1) * scale);
          ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
        }
      }
    }
  }

  /* ---------- Core: generate ---------- */
  function generate(opts) {
    const silent = Boolean(opts && opts.silent);
    const token = ++renderToken;
    const result = normalizeUrl(input.value);

    if (result.empty) {
      hideError();
      resetPreview();
      return;
    }

    if (!result.ok) {
      resetPreview();
      if (silent) hideError();
      else showError(result.message);
      return;
    }

    hideError();

    try {
      drawQR(result.url);
    } catch (err) {
      console.error("[QR Studio]", err);
      resetPreview();
      if (!silent)
        showError("Sorry, that link could not be turned into a QR code.");
      return;
    }

    if (token !== renderToken) return;
    showPreview(result.url);
  }

  /* ---------- Input events ---------- */
  input.addEventListener("input", () => {
    clearBtn.hidden = input.value.length === 0;
    clearTimeout(typeTimer);
    typeTimer = setTimeout(() => generate({ silent: true }), 220);
  });

  input.addEventListener("paste", (event) => {
    const cd = event.clipboardData || window.clipboardData;
    const text = cd ? cd.getData("text") : "";
    if (!text || !text.trim()) return;
    event.preventDefault();
    input.value = text.trim();
    clearBtn.hidden = false;
    clearTimeout(typeTimer);
    generate();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    clearTimeout(typeTimer);
    generate();
    input.blur();
  });

  clearBtn.addEventListener("click", () => {
    input.value = "";
    clearBtn.hidden = true;
    hideError();
    resetPreview();
    input.focus();
  });

  pasteBtn.addEventListener("click", async () => {
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      showError(
        "Clipboard access is blocked. Paste manually with Ctrl / ⌘ + V.",
      );
      input.focus();
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        showError("Your clipboard is empty — copy a link first.");
        return;
      }
      input.value = text.trim();
      clearBtn.hidden = false;
      clearTimeout(typeTimer);
      generate();
    } catch {
      showError(
        "Clipboard access was blocked. Paste manually with Ctrl / ⌘ + V.",
      );
      input.focus();
    }
  });

  /* ---------- Preview actions ---------- */
  downloadBtn.addEventListener("click", () => {
    if (!state.url || canvas.hidden) return;
    const finish = (blob) => {
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = state.fileName + ".png";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
      showToast("QR code downloaded");
    };
    if (canvas.toBlob) {
      canvas.toBlob(
        (blob) =>
          blob ? finish(blob) : showToast("Download failed — please try again"),
        "image/png",
      );
    } else {
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = state.fileName + ".png";
      link.click();
      showToast("QR code downloaded");
    }
  });

  copyBtn.addEventListener("click", async () => {
    if (!state.url) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(state.url);
      } else {
        const helper = document.createElement("textarea");
        helper.value = state.url;
        helper.setAttribute("readonly", "");
        helper.style.position = "fixed";
        helper.style.opacity = "0";
        document.body.appendChild(helper);
        helper.select();
        document.execCommand("copy");
        helper.remove();
      }
      showToast("Link copied to clipboard");
    } catch {
      showToast("Could not copy — please copy manually");
    }
  });

  /* ---------- Theme ---------- */
  function readStoredTheme() {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch {
      return null;
    }
  }
  function storeTheme(t) {
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {}
  }

  const stored = readStoredTheme();
  if (stored === "dark" || stored === "light")
    root.setAttribute("data-theme", stored);

  themeToggle.addEventListener("click", () => {
    const current = root.getAttribute("data-theme");
    const systemDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const isDark = current ? current === "dark" : systemDark;
    const next = isDark ? "light" : "dark";
    root.setAttribute("data-theme", next);
    storeTheme(next);
  });

  /* ---------- Misc ---------- */
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
  clearBtn.hidden = input.value.length === 0;
  resetPreview();
})();
