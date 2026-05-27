import React, { useState, useEffect } from 'react';

// --- 型定義 ---
type Student = {
  id: string;
  number: number;
  name: string;
  kana: string;
  gender: '男' | '女';
  height: number;
  fixedSeat?: number | null; // 固定席のインデックス(0~35)。固定しない場合はnull
  preferFront?: boolean;
  preferNearStudentIds?: string[];
  avoidNearStudentIds?: string[];
};

type Seat = {
  index: number;
  studentId: string | null;
  isVoid: boolean; // 空席（机がない）設定
};

type DragInfo = {
  type: 'list' | 'seat';
  studentId: string;
  seatIndex?: number;
} | null;

// --- CSVパース関数 ---
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.replace(/^"|"$/g, '').trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.replace(/^"|"$/g, '').trim());
  return result;
};

// --- サンプルデータ生成 ---
const generateMockStudents = (): Student[] => {
  const students: Student[] = [];
  const familyNames = ['佐藤', '鈴木', '高橋', '田中', '伊藤', '渡辺', '山本', '中村', '小林', '加藤'];
  const givenNamesM = ['大翔', '蓮', '樹', '湊', '朝陽', '陽翔', '悠真', '結翔', '蒼', '律'];
  const givenNamesF = ['陽葵', '紬', '凛', '結菜', '芽依', '詩', '莉子', '結愛', 'ひまり', '結衣'];

  for (let i = 1; i <= 35; i++) {
    const isBoy = i % 2 !== 0;
    const fName = familyNames[Math.floor(Math.random() * familyNames.length)];
    const gName = isBoy ? givenNamesM[Math.floor(Math.random() * givenNamesM.length)] : givenNamesF[Math.floor(Math.random() * givenNamesF.length)];
    students.push({
      id: `std_${i}`,
      number: i,
      name: `${fName} ${gName}`,
      kana: 'さ行', // 簡略化
      gender: isBoy ? '男' : '女',
      height: Math.floor(Math.random() * 30) + 120, // 120cm ~ 150cm
      fixedSeat: null,
      preferFront: false,
      preferNearStudentIds: [],
      avoidNearStudentIds: []
    });
  }
  return students;
};

// --- 9ブロック分類計算関数 ---
const getSeatBlockName = (index: number, r: number, c: number): string => {
  const row = Math.floor(index / c);
  const col = index % c;
  
  let rowWord = '';
  if (row < r / 3) {
    rowWord = '前';
  } else if (row < (r * 2) / 3) {
    rowWord = '中';
  } else {
    rowWord = '後';
  }

  let colWord = '';
  if (col < c / 3) {
    colWord = '左';
  } else if (col < (c * 2) / 3) {
    colWord = '中央';
  } else {
    colWord = '右';
  }

  if (rowWord === '中' && colWord === '中央') {
    return '中央';
  }
  return `${rowWord}${colWord}`;
};

const isSeatNear = (idxA: number, idxB: number, c: number): boolean => {
  const rowA = Math.floor(idxA / c);
  const colA = idxA % c;
  const rowB = Math.floor(idxB / c);
  const colB = idxB % c;
  return Math.abs(rowA - rowB) <= 1 && Math.abs(colA - colB) <= 1;
};

const isSamePair = (idxA: number, idxB: number, c: number): boolean => {
  const rowA = Math.floor(idxA / c);
  const colA = idxA % c;
  const rowB = Math.floor(idxB / c);
  const colB = idxB % c;
  if (rowA !== rowB) return false;
  const pairGroupA = Math.floor(colA / 2);
  const pairGroupB = Math.floor(colB / 2);
  return pairGroupA === pairGroupB;
};

const isSameGroup = (idxA: number, idxB: number, c: number): boolean => {
  const rowA = Math.floor(idxA / c);
  const colA = idxA % c;
  const rowB = Math.floor(idxB / c);
  const colB = idxB % c;
  
  const groupRowA = Math.floor(rowA / 2);
  const groupColA = Math.floor(colA / 2);
  const groupRowB = Math.floor(rowB / 2);
  const groupColB = Math.floor(colB / 2);
  
  return groupRowA === groupRowB && groupColA === groupColB;
};

const App: React.FC = () => {
  // --- 状態管理 ---
  const [students, setStudents] = useState<Student[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [rows, setRows] = useState(6);
  const [cols, setCols] = useState(6);
  const [autoType, setAutoType] = useState<'random' | 'height' | 'gender'>('random');
  const [dragInfo, setDragInfo] = useState<DragInfo>(null);
  const [logoError, setLogoError] = useState(false);
  const [showBlocks, setShowBlocks] = useState(false);
  const [printMode, setPrintMode] = useState<'teacher' | 'display'>('teacher');
  const [showEditModal, setShowEditModal] = useState(false);
  const [seatMode, setSeatMode] = useState<'single' | 'pair' | 'group'>('single');
  const [pairPreferNear, setPairPreferNear] = useState(false);
  const [pairAvoidNear, setPairAvoidNear] = useState(false);
  const [pairGenderMixed, setPairGenderMixed] = useState(false);

  // ペアモードの判定を関数化
  const isPairModeActive = () => {
    return seatMode === 'pair';
  };

  // 初期化
  useEffect(() => {
    setStudents(generateMockStudents());
    initSeats(6, 6);
  }, []);

  const initSeats = (r: number, c: number) => {
    const newSeats: Seat[] = [];
    for (let i = 0; i < r * c; i++) {
      newSeats.push({ index: i, studentId: null, isVoid: i === 35 }); // 最後の1席を初期状態で空席にする
    }
    setSeats(newSeats);
  };

  // --- 名簿編集・CSV関連のアクション ---
  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('CSVを取り込みますか？ 現在の座席配置はクリアされます。')) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
        if (lines.length === 0) return;

        const parsedStudents: Student[] = [];

        // 1行目の解析（見出しチェック）
        let startIdx = 0;
        const firstLineFields = parseCSVLine(lines[0]);
        const hasHeader = firstLineFields.some(field => 
          field.includes('出席番号') || field.includes('氏名') || field.includes('名前') || field.includes('ふりがな') || field.includes('性別') || field.includes('身長')
        );

        if (hasHeader) {
          startIdx = 1;
        }

        for (let i = startIdx; i < lines.length; i++) {
          const fields = parseCSVLine(lines[i]);
          if (fields.length < 2) continue; // 少なくとも出席番号と名前は必要

          const num = Number(fields[0]) || (i + 1 - startIdx);
          const name = fields[1] || `児童 ${num}`;
          const kana = fields[2] || '';
          const genderInput = fields[3] || '男';
          const gender: '男' | '女' = (genderInput.includes('女') || genderInput === 'f' || genderInput === 'F') ? '女' : '男';
          const height = Number(fields[4]) || 130;

          parsedStudents.push({
            id: `std_${num}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            number: num,
            name,
            kana,
            gender,
            height,
            fixedSeat: null,
            preferFront: false,
            preferNearStudentIds: [],
            avoidNearStudentIds: []
          });
        }

        // 出席番号順にソート
        parsedStudents.sort((a, b) => a.number - b.number);

        setStudents(parsedStudents);
        // 配置をすべてクリア
        setSeats(prev => prev.map(s => ({ ...s, studentId: null })));
        alert("CSVの取り込みが完了しました。");

      } catch (error) {
        console.error("CSVの解析に失敗しました", error);
        alert("CSVの解析に失敗しました。ファイル形式を確認してください。");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCSVExport = () => {
    try {
      let csvContent = '出席番号,氏名,ふりがな,性別,身長\r\n';
      students.forEach(student => {
        const row = [
          student.number,
          `"${student.name.replace(/"/g, '""')}"`,
          `"${student.kana.replace(/"/g, '""')}"`,
          student.gender,
          student.height
        ].join(',');
        csvContent += row + '\r\n';
      });

      // BOM付きUTF-8
      const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
      const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'classroom-students-list.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("CSVの書き出しに失敗しました", error);
      alert("CSVの書き出しに失敗しました。");
    }
  };

  const handleAddStudent = () => {
    const nextNumber = students.length > 0 ? Math.max(...students.map(s => s.number)) + 1 : 1;
    const newStudent: Student = {
      id: `std_${nextNumber}_${Date.now()}`,
      number: nextNumber,
      name: `新しい児童 ${nextNumber}`,
      kana: '',
      gender: '男',
      height: 130,
      fixedSeat: null,
      preferFront: false,
      preferNearStudentIds: [],
      avoidNearStudentIds: []
    };
    setStudents(prev => [...prev, newStudent].sort((a, b) => a.number - b.number));
  };

  const handleRemoveStudent = (id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id));
    setSeats(prev => prev.map(s => s.studentId === id ? { ...s, studentId: null } : s));
  };

  const handleUpdateStudent = (id: string, field: keyof Student, value: any) => {
    setStudents(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, [field]: value };
      }
      return s;
    }));
  };

  // --- ドラッグ＆ドロップ処理 ---
  const handleDragStartFromList = (studentId: string) => {
    setDragInfo({ type: 'list', studentId });
  };

  const handleDragStartFromSeat = (studentId: string, seatIndex: number) => {
    setDragInfo({ type: 'seat', studentId, seatIndex });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // ドロップを許可
  };

  const handleDropToSeat = (targetSeatIndex: number) => {
    if (!dragInfo) return;

    const { type, studentId, seatIndex } = dragInfo;

    setSeats((prev) => {
      const newSeats = [...prev];
      const targetSeat = newSeats[targetSeatIndex];

      if (targetSeat.isVoid) return prev; // 空席にはドロップ不可

      if (type === 'list') {
        // 名簿から配置
        // すでに別の席にいる場合は元の席を空にする
        const existingSeatIndex = newSeats.findIndex(s => s.studentId === studentId);
        if (existingSeatIndex !== -1) {
          newSeats[existingSeatIndex].studentId = null;
        }
        
        // ターゲット席に誰かいる場合、その子を未配置に戻す（ここでは単に上書きし、元の子はリストに戻る形になる）
        targetSeat.studentId = studentId;

      } else if (type === 'seat' && seatIndex !== undefined) {
        // 席同士の入れ替え
        const sourceSeat = newSeats[seatIndex];
        const tempId = targetSeat.studentId;
        
        targetSeat.studentId = sourceSeat.studentId;
        sourceSeat.studentId = tempId;
      }
      return newSeats;
    });
    setDragInfo(null);
  };

  const handleDropToList = (e: React.DragEvent) => {
    e.preventDefault();
    if (dragInfo?.type === 'seat' && dragInfo.seatIndex !== undefined) {
      const seatIndex = dragInfo.seatIndex;
      // 席から名簿へ戻す（席を空にする）
      setSeats((prev) => {
        const newSeats = [...prev];
        newSeats[seatIndex].studentId = null;
        return newSeats;
      });
    }
    setDragInfo(null);
  };

  // --- 座席の操作 ---
  const toggleVoidSeat = (index: number) => {
    setSeats((prev) => {
      const newSeats = [...prev];
      const seat = newSeats[index];
      if (seat.studentId) {
        // 生徒がいる場合は空席（机なし）にできないようにするか、生徒を外す
        seat.studentId = null;
      }
      seat.isVoid = !seat.isVoid;
      return newSeats;
    });
  };

  const setFixedSeat = (studentId: string, seatIndex: number | null) => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, fixedSeat: seatIndex } : s));
  };

  // --- 2人組席モード用自動配置アルゴリズム ---
  const handlePairAutoLayout = (newSeats: Seat[], placedStudentIds: Set<string>) => {
    // 1. 未配置の児童リスト
    let unplaced = students.filter(s => !placedStudentIds.has(s.id));

    // 2. 席ペアスロットの抽出
    const slots: { idx1: number; idx2: number }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c += 2) {
        const idx1 = r * cols + c;
        const idx2 = c + 1 < cols ? r * cols + (c + 1) : -1;
        slots.push({ idx1, idx2 });
      }
    }

    // 3. 避ける関係/近づけたい関係の判定ヘルパー
    const shouldAvoid = (s1: Student, s2: Student) => {
      if (!pairAvoidNear) return false;
      return (s1.avoidNearStudentIds?.includes(s2.id)) || (s2.avoidNearStudentIds?.includes(s1.id));
    };

    // 4. ペアの構築
    const pairedGroups: Student[][] = [];

    // 4.1 最優先：近づけたい子同士のペアリング
    if (pairPreferNear) {
      const pairedIds = new Set<string>();
      for (let i = 0; i < unplaced.length; i++) {
        const s1 = unplaced[i];
        if (pairedIds.has(s1.id)) continue;

        const targetId = s1.preferNearStudentIds?.[0];
        if (targetId) {
          const targetIdx = unplaced.findIndex(s => s.id === targetId);
          if (targetIdx !== -1 && !pairedIds.has(targetId)) {
            const s2 = unplaced[targetIdx];
            if (!shouldAvoid(s1, s2)) {
              pairedGroups.push([s1, s2]);
              pairedIds.add(s1.id);
              pairedIds.add(targetId);
            }
          }
        }
      }
      unplaced = unplaced.filter(s => !pairedIds.has(s.id));
    }

    // 4.2 次点：男女ペア
    if (pairGenderMixed) {
      const pairedIds = new Set<string>();
      const boys = unplaced.filter(s => s.gender === '男');
      const girls = unplaced.filter(s => s.gender === '女');

      let bIdx = 0;
      let gIdx = 0;
      while (bIdx < boys.length && gIdx < girls.length) {
        const s1 = boys[bIdx];
        const s2 = girls[gIdx];
        if (shouldAvoid(s1, s2)) {
          // 避ける関係の場合、girlsの次の候補を探す
          let found = false;
          for (let k = gIdx + 1; k < girls.length; k++) {
            if (!shouldAvoid(s1, girls[k])) {
              const temp = girls[gIdx];
              girls[gIdx] = girls[k];
              girls[k] = temp;
              found = true;
              break;
            }
          }
          if (!found) {
            bIdx++;
            continue;
          }
        }
        pairedGroups.push([boys[bIdx], girls[gIdx]]);
        pairedIds.add(boys[bIdx].id);
        pairedIds.add(girls[gIdx].id);
        bIdx++;
        gIdx++;
      }
      unplaced = unplaced.filter(s => !pairedIds.has(s.id));
    }

    // 4.3 残りの児童をペアリング（avoid関係を極力回避）
    const pairedIds = new Set<string>();
    for (let i = 0; i < unplaced.length; i++) {
      const s1 = unplaced[i];
      if (pairedIds.has(s1.id)) continue;

      let partner: Student | null = null;
      for (let j = i + 1; j < unplaced.length; j++) {
        const s2 = unplaced[j];
        if (!pairedIds.has(s2.id) && !shouldAvoid(s1, s2)) {
          partner = s2;
          break;
        }
      }

      if (partner) {
        pairedGroups.push([s1, partner]);
        pairedIds.add(s1.id);
        pairedIds.add(partner.id);
      } else {
        pairedGroups.push([s1]);
        pairedIds.add(s1.id);
      }
    }
    unplaced = unplaced.filter(s => !pairedIds.has(s.id));

    // 5. ペアスロットの状態集計（空き数など）
    const slotStatus = slots.map(slot => {
      const seat1 = newSeats[slot.idx1];
      const seat2 = slot.idx2 !== -1 ? newSeats[slot.idx2] : null;

      const v1 = seat1.isVoid;
      const v2 = seat2 ? seat2.isVoid : true;

      const p1 = seat1.studentId;
      const p2 = seat2 ? seat2.studentId : null;

      let capacity = 0;
      if (!v1 && !p1) capacity++;
      if (seat2 && !v2 && !p2) capacity++;

      return {
        slot,
        capacity,
        p1,
        p2,
        v1,
        v2,
        row: Math.floor(slot.idx1 / cols),
        colDist: Math.abs((slot.idx1 % cols) - (cols - 1) / 2)
      };
    });

    // 6. 配置順・グループ順のソート
    const getGroupPriorityVal = (g: Student[]) => {
      const hasFrontPref = g.some(s => s.preferFront);
      const minHeight = g.length > 0 ? Math.min(...g.map(s => s.height)) : 130;
      let score = minHeight;
      if (hasFrontPref) {
        score -= 1000;
      }
      return score;
    };

    if (autoType === 'height') {
      pairedGroups.sort((a, b) => getGroupPriorityVal(a) - getGroupPriorityVal(b));
    } else {
      pairedGroups.sort((a, b) => {
        const aPref = a.some(s => s.preferFront);
        const bPref = b.some(s => s.preferFront);
        if (aPref !== bPref) return aPref ? -1 : 1;
        return Math.random() - 0.5;
      });
    }

    slotStatus.sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      if (autoType === 'height') {
        return a.colDist - b.colDist;
      }
      return a.slot.idx1 - b.slot.idx1;
    });

    // 7. 配置の実行
    const singleStudentsToPlace: Student[] = [];
    const pairedGroupsToPlace: Student[][] = [];

    pairedGroups.forEach(g => {
      if (g.length === 1) {
        singleStudentsToPlace.push(g[0]);
      } else {
        pairedGroupsToPlace.push(g);
      }
    });

    // 7.1 容量1のスロット（片方固定、または端の席）を先に埋める
    slotStatus.forEach(status => {
      if (status.capacity === 1) {
        let student: Student | null = null;
        if (singleStudentsToPlace.length > 0) {
          student = singleStudentsToPlace.shift()!;
        } else if (pairedGroupsToPlace.length > 0) {
          const group = pairedGroupsToPlace[0];
          student = group.shift()!;
          if (group.length === 0) {
            pairedGroupsToPlace.shift();
          } else {
            singleStudentsToPlace.push(group[0]);
            pairedGroupsToPlace.shift();
          }
        }

        if (student) {
          if (!status.v1 && !status.p1) {
            newSeats[status.slot.idx1].studentId = student.id;
          } else if (status.slot.idx2 !== -1 && !status.v2 && !status.p2) {
            newSeats[status.slot.idx2].studentId = student.id;
          }
          status.capacity = 0;
        }
      }
    });

    // 7.2 容量2のスロットにペアを配置
    slotStatus.forEach(status => {
      if (status.capacity === 2) {
        let group: Student[] = [];
        if (pairedGroupsToPlace.length > 0) {
          group = pairedGroupsToPlace.shift()!;
        } else if (singleStudentsToPlace.length >= 2) {
          group = [singleStudentsToPlace.shift()!, singleStudentsToPlace.shift()!];
        } else if (singleStudentsToPlace.length === 1) {
          group = [singleStudentsToPlace.shift()!];
        }

        if (group.length > 0) {
          newSeats[status.slot.idx1].studentId = group[0].id;
          if (group.length > 1 && status.slot.idx2 !== -1) {
            newSeats[status.slot.idx2].studentId = group[1].id;
          }
          status.capacity = 0;
        }
      } else if (status.capacity === 1) {
        let student: Student | null = null;
        if (singleStudentsToPlace.length > 0) {
          student = singleStudentsToPlace.shift()!;
        } else if (pairedGroupsToPlace.length > 0) {
          const group = pairedGroupsToPlace[0];
          student = group.shift()!;
          if (group.length === 0) {
            pairedGroupsToPlace.shift();
          } else {
            singleStudentsToPlace.push(group[0]);
            pairedGroupsToPlace.shift();
          }
        }

        if (student) {
          if (!status.v1 && !status.p1) {
            newSeats[status.slot.idx1].studentId = student.id;
          } else if (status.slot.idx2 !== -1 && !status.v2 && !status.p2) {
            newSeats[status.slot.idx2].studentId = student.id;
          }
          status.capacity = 0;
        }
      }
    });

    // セーフティネット
    const allLeftover = [...singleStudentsToPlace];
    pairedGroupsToPlace.forEach(g => allLeftover.push(...g));
    if (allLeftover.length > 0) {
      newSeats.forEach(seat => {
        if (!seat.isVoid && !seat.studentId && allLeftover.length > 0) {
          seat.studentId = allLeftover.shift()!.id;
        }
      });
    }

    setSeats(newSeats);
  };

  // --- 自動配置アルゴリズム ---
  const handleAutoLayout = () => {
    // 1. 現在の配置をクリア（固定席以外）
    const newSeats = [...seats];
    newSeats.forEach(s => {
      s.studentId = null;
    });

    // 2. 固定席の児童を配置
    const placedStudentIds = new Set<string>();
    students.forEach(student => {
      if (typeof student.fixedSeat === 'number' && student.fixedSeat < newSeats.length) {
        if (!newSeats[student.fixedSeat].isVoid) {
          newSeats[student.fixedSeat].studentId = student.id;
          placedStudentIds.add(student.id);
        }
      }
    });

    // 将来のペア配置条件の拡張のため、現在のペアモード状態を取得
    const isPair = isPairModeActive();
    if (isPair) {
      handlePairAutoLayout(newSeats, placedStudentIds);
      return;
    }

    // 3. 未配置の児童をリストアップ
    let unplacedStudents = students.filter(s => !placedStudentIds.has(s.id));

    // 4. 条件に合わせてソート
    if (autoType === 'random') {
      const frontPref = unplacedStudents.filter(s => s.preferFront).sort(() => Math.random() - 0.5);
      const normal = unplacedStudents.filter(s => !s.preferFront).sort(() => Math.random() - 0.5);
      unplacedStudents = [...frontPref, ...normal];
    } else if (autoType === 'height') {
      // 身長順（低い子を前方へ）かつ 前方希望(preferFront)を最優先
      const getHeightVal = (s: Student) => (s.height <= 0 || s.height === undefined) ? 999 : s.height;
      const frontPref = unplacedStudents.filter(s => s.preferFront).sort((a, b) => getHeightVal(a) - getHeightVal(b));
      const normal = unplacedStudents.filter(s => !s.preferFront).sort((a, b) => getHeightVal(a) - getHeightVal(b));
      unplacedStudents = [...frontPref, ...normal];
    } else if (autoType === 'gender') {
      // 男女交互になるように並べ替え
      const boys = unplacedStudents.filter(s => s.gender === '男').sort(() => Math.random() - 0.5);
      const girls = unplacedStudents.filter(s => s.gender === '女').sort(() => Math.random() - 0.5);
      const mixed = [];
      const maxLength = Math.max(boys.length, girls.length);
      for (let i = 0; i < maxLength; i++) {
        if (boys[i]) mixed.push(boys[i]);
        if (girls[i]) mixed.push(girls[i]);
      }
      unplacedStudents = mixed;
    }

    // 5. 空いている席に配置
    if (autoType === 'height') {
      // 身長順の場合：前方の行を優先し、列は左右の偏りが出ないように「中央から外側」に配置スロットを決める
      const availableSeatIndices: number[] = [];
      for (let i = 0; i < newSeats.length; i++) {
        if (!newSeats[i].isVoid && !newSeats[i].studentId) {
          availableSeatIndices.push(i);
        }
      }

      const centerCol = (cols - 1) / 2;
      availableSeatIndices.sort((a, b) => {
        const rowA = Math.floor(a / cols);
        const rowB = Math.floor(b / cols);
        if (rowA !== rowB) {
          return rowA - rowB; // 行が前（小さい）方を優先
        }
        
        const colA = a % cols;
        const colB = b % cols;
        const distA = Math.abs(colA - centerCol);
        const distB = Math.abs(colB - centerCol);
        if (distA !== distB) {
          return distA - distB; // 中央に近い方を優先
        }
        return colA - colB; // それでも同じなら左側優先
      });

      let studentIndex = 0;
      for (let i = 0; i < availableSeatIndices.length; i++) {
        if (studentIndex < unplacedStudents.length) {
          const seatIdx = availableSeatIndices[i];
          newSeats[seatIdx].studentId = unplacedStudents[studentIndex].id;
          studentIndex++;
        }
      }
    } else {
      // 通常の配置（前から順番に詰める）
      let studentIndex = 0;
      for (let i = 0; i < newSeats.length; i++) {
        if (!newSeats[i].isVoid && !newSeats[i].studentId && studentIndex < unplacedStudents.length) {
          newSeats[i].studentId = unplacedStudents[studentIndex].id;
          studentIndex++;
        }
      }
    }

    setSeats(newSeats);
  };

  // --- データ保存・読込 ---
  const handleExport = () => {
    const data = { 
      students, 
      seats, 
      rows, 
      cols, 
      showBlocks, 
      printMode, 
      seatMode,
      pairPreferNear,
      pairAvoidNear,
      pairGenderMixed
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'seat-layout-data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.students && data.seats) {
          const importedStudents: Student[] = data.students.map((s: any): Student | null => {
            if (!s) return null;
            return {
              id: s.id || `std_${s.number || Math.random()}`,
              number: s.number !== undefined ? s.number : 0,
              name: s.name || '',
              kana: s.kana || '',
              gender: s.gender === '女' ? '女' : '男',
              height: s.height !== undefined ? s.height : 130,
              fixedSeat: s.fixedSeat !== undefined ? s.fixedSeat : null,
              preferFront: !!s.preferFront,
              preferNearStudentIds: Array.isArray(s.preferNearStudentIds) ? s.preferNearStudentIds : [],
              avoidNearStudentIds: Array.isArray(s.avoidNearStudentIds) ? s.avoidNearStudentIds : []
            };
          }).filter((s: Student | null): s is Student => s !== null);
          setStudents(importedStudents);
          setSeats(data.seats);
          if (data.rows) setRows(data.rows);
          if (data.cols) setCols(data.cols);
          if (data.showBlocks !== undefined) {
            setShowBlocks(data.showBlocks);
          }
          if (data.printMode !== undefined) {
            setPrintMode(data.printMode);
          } else {
            setPrintMode('teacher');
          }
          if (data.seatMode !== undefined) {
            setSeatMode(data.seatMode);
          } else {
            setSeatMode('single');
          }
          setPairPreferNear(data.pairPreferNear !== undefined ? data.pairPreferNear : false);
          setPairAvoidNear(data.pairAvoidNear !== undefined ? data.pairAvoidNear : false);
          setPairGenderMixed(data.pairGenderMixed !== undefined ? data.pairGenderMixed : false);
        }
      } catch (error) {
        console.error("ファイルの読み込みに失敗しました", error);
      }
    };
    reader.readAsText(file);
  };

  const clearAllSeats = () => {
    if(window.confirm('すべての配置をクリアしますか？（固定席も解除されます）')) {
      setSeats(prev => prev.map(s => ({ ...s, studentId: null })));
      setStudents(prev => prev.map(s => ({ ...s, fixedSeat: null })));
    }
  };


  // --- 描画用ヘルパー ---
  const getStudentById = (id: string | null) => {
    return students.find(s => s.id === id);
  };

  const isPlaced = (studentId: string) => {
    return seats.some(s => s.studentId === studentId);
  };

  const renderStudentName = (name: string, isDisplayMode: boolean) => {
    const parts = name.trim().split(/[\s　]+/);
    
    // 掲示用は大きめ、教師用は標準サイズ
    const sizeClass = isDisplayMode 
      ? "text-xl sm:text-2xl print:text-2xl" 
      : "text-base sm:text-lg print:text-[13px] print:leading-none"; // 印刷時は少し小さくして1ページ収まりを良くする
      
    const colorClass = isDisplayMode ? "text-slate-800" : "text-slate-700";

    // 姓と名がスペースで区切られている場合
    if (parts.length >= 2) {
      const familyName = parts[0];
      const givenName = parts.slice(1).join(' ');
      return (
        <div className={`flex flex-col items-center justify-center text-center leading-tight ${colorClass} w-full overflow-hidden print:overflow-visible`}>
          <span className={`${sizeClass} font-bold truncate print:whitespace-normal print:overflow-visible w-full`}>{familyName}</span>
          <span className={`${sizeClass} font-bold truncate print:whitespace-normal print:overflow-visible w-full`}>{givenName}</span>
        </div>
      );
    }

    // スペースがない場合は折り返し表示
    return (
      <div className={`text-center break-all leading-tight ${colorClass} w-full px-1 print:overflow-visible`}>
        <span className={`${sizeClass} font-bold print:whitespace-normal`}>{name}</span>
      </div>
    );
  };

  // 配慮条件のチェック（警告・確認メッセージの生成）
  const getAlertMessages = () => {
    const alerts: { type: 'warning' | 'info'; text: string }[] = [];
    
    const studentSeatMap = new Map<string, number>();
    seats.forEach(s => {
      if (s.studentId) {
        studentSeatMap.set(s.studentId, s.index);
      }
    });

    students.forEach(student => {
      const seatIdx = studentSeatMap.get(student.id);
      if (seatIdx === undefined) return;

      // 1. 注意：離したい児童が近い
      if (student.avoidNearStudentIds && student.avoidNearStudentIds.length > 0) {
        student.avoidNearStudentIds.forEach(targetId => {
          const targetSeatIdx = studentSeatMap.get(targetId);
          if (targetSeatIdx === undefined) return;

          if (student.id < targetId) {
            const isNear = isSeatNear(seatIdx, targetSeatIdx, cols) || 
                           (seatMode === 'pair' && isSamePair(seatIdx, targetSeatIdx, cols)) ||
                           (seatMode === 'group' && isSameGroup(seatIdx, targetSeatIdx, cols));
            if (isNear) {
              const targetStudent = students.find(s => s.id === targetId);
              if (targetStudent) {
                alerts.push({
                  type: 'warning',
                  text: `注意：離したい児童が近い（${student.name}さんと${targetStudent.name}さん）`
                });
              }
            }
          }
        });
      }

      // 2. 確認：近づけたい児童が離れている
      if (student.preferNearStudentIds && student.preferNearStudentIds.length > 0) {
        student.preferNearStudentIds.forEach(targetId => {
          const targetSeatIdx = studentSeatMap.get(targetId);
          if (targetSeatIdx === undefined) return;

          if (student.id < targetId) {
            const isNear = isSeatNear(seatIdx, targetSeatIdx, cols) || 
                           (seatMode === 'pair' && isSamePair(seatIdx, targetSeatIdx, cols)) ||
                           (seatMode === 'group' && isSameGroup(seatIdx, targetSeatIdx, cols));
            if (!isNear) {
              const targetStudent = students.find(s => s.id === targetId);
              if (targetStudent) {
                alerts.push({
                  type: 'info',
                  text: `確認：近づけたい児童が離れている（${student.name}さんと${targetStudent.name}さん）`
                });
              }
            }
          }
        });
      }

      // 3. 確認：前方希望の児童が前方に配置されていない
      if (student.preferFront) {
        const blockName = getSeatBlockName(seatIdx, rows, cols);
        const isFront = blockName === '前左' || blockName === '前中央' || blockName === '前右';
        if (!isFront) {
          alerts.push({
            type: 'info',
            text: `確認：前方希望の児童が前方に配置されていない（${student.name}さん）`
          });
        }
      }
    });

    return alerts;
  };

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-800">
      
      {/* 左側：名簿エリア (印刷時非表示) */}
      <div className="w-72 bg-white border-r flex flex-col print:hidden shadow-sm z-10">
        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
              <span className="w-2 h-6 bg-blue-500 rounded-sm"></span>
              児童名簿
            </h2>
            <p className="text-sm text-slate-500 mt-1">ドラッグして座席に配置できます</p>
          </div>
          <button
            onClick={() => setShowEditModal(true)}
            className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 font-medium px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-sm"
          >
            名簿編集
          </button>
        </div>
        
        <div 
          className="flex-1 overflow-y-auto p-3"
          onDragOver={handleDragOver}
          onDrop={handleDropToList}
        >
          {students.map(student => {
            const placed = isPlaced(student.id);
            const isFixed = student.fixedSeat !== null && student.fixedSeat !== undefined;
            return (
              <div
                key={student.id}
                draggable={!isFixed} // 固定席の子はリストからドラッグできないようにする
                onDragStart={() => handleDragStartFromList(student.id)}
                className={`p-3 mb-2 rounded-lg border-2 flex items-center justify-between cursor-move transition-colors
                  ${placed ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-blue-200 hover:border-blue-400 shadow-sm'}
                  ${isFixed ? 'border-orange-300 bg-orange-50' : ''}
                `}
              >
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 font-mono text-sm w-5 text-right">{student.number}</span>
                  <div>
                    <div className="font-medium text-slate-700">{student.name}</div>
                    <div className="text-xs text-slate-400 flex gap-2">
                      <span>{student.gender}</span>
                      <span>{student.height}cm</span>
                    </div>
                  </div>
                </div>
                {placed && !isFixed && <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded">配置済</span>}
                {isFixed && <span className="text-xs bg-orange-200 text-orange-700 px-2 py-1 rounded">固定</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* 中央：座席表エリア */}
      <div className="flex-1 flex flex-col overflow-y-auto relative bg-slate-100 print:bg-white print-area">
        {/* ヘッダー部分（ロゴ画像、タイトル、説明文） */}
        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between bg-white/50 backdrop-blur-sm border-b print:bg-white print:border-none print:pb-6">
           <div className="flex items-center gap-3">
             {!logoError && (
               <img 
                 src="/logo.png" 
                 alt="ロゴ" 
                 onError={() => setLogoError(true)} 
                 className="h-10 w-auto object-contain print:h-12"
               />
             )}
             <div>
               <h1 className="text-2xl font-bold text-slate-700">学級座席デザイナー v0.2</h1>
               <p className="text-xs text-slate-500 mt-0.5">担任の判断を助ける、半自動の座席表作成ツール</p>
             </div>
           </div>
           <div className="text-sm text-slate-500 print:hidden mt-2 sm:mt-0">
             配置済み: {seats.filter(s => s.studentId).length} / {students.length}人
           </div>
        </div>

        {/* 配慮確認セクション */}
        {printMode === 'teacher' && getAlertMessages().length > 0 && (
          <div className="mx-8 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5 max-h-40 overflow-y-auto shadow-inner">
            <h4 className="font-bold text-amber-800 text-sm flex items-center gap-1.5 mb-2 border-b border-amber-200 pb-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              配慮確認
            </h4>
            <div className="space-y-1">
              {getAlertMessages().map((msg, i) => (
                <div 
                  key={i} 
                  className={`text-xs flex items-center gap-2 ${msg.type === 'warning' ? 'text-rose-600 font-semibold' : 'text-slate-600'}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${msg.type === 'warning' ? 'bg-rose-500' : 'bg-amber-400'}`}></span>
                  {msg.text}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 p-8 flex flex-col items-center">
          {/* 黒板エリア */}
          <div className="w-3/4 max-w-2xl h-12 bg-green-700 rounded-lg shadow-inner flex items-center justify-center mb-8 border-4 border-green-800 print:bg-green-800">
            <span className="text-white font-bold tracking-widest opacity-80">黒板</span>
          </div>

          {/* 教卓 */}
          <div className="w-32 h-16 bg-amber-100 border-2 border-amber-300 rounded mb-12 flex items-center justify-center shadow-sm print:bg-amber-50">
            <span className="text-amber-700 font-medium text-sm">教卓</span>
          </div>

          {/* 座席グリッド */}
          <div 
            className={`grid ${seatMode === 'single' ? 'gap-y-4 gap-x-4' : seatMode === 'pair' ? 'gap-y-4 gap-x-1' : 'gap-y-1 gap-x-1'}`}
            style={{ 
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              width: '100%',
              maxWidth: '900px'
            }}
          >
            {seats.map((seat, index) => {
              const student = getStudentById(seat.studentId);
              const isFixed = student?.fixedSeat === index;

              const row = Math.floor(index / cols);
              const col = index % cols;
              const isPairMode = seatMode === 'pair';
              const isLeftOfPair = isPairMode && (col % 2 === 0);
              const isRightOfPair = isPairMode && (col % 2 === 1);

              // ペアグループごとの通し番号 (1始まり)
              const pairGroupInRow = Math.floor(col / 2);
              const pairsPerRow = Math.ceil(cols / 2);
              const pairNumber = row * pairsPerRow + pairGroupInRow + 1;

              // 班グループごとの通し番号とインデックス (1始まり)
              const isGroupMode = seatMode === 'group';
              const rowInGroup = row % 2;
              const colInGroup = col % 2;
              const groupsPerRow = Math.ceil(cols / 2);
              const groupRowIdx = Math.floor(row / 2);
              const groupColIdx = Math.floor(col / 2);
              const groupNumber = groupRowIdx * groupsPerRow + groupColIdx + 1;

              // マージンおよびボーダースタイルの調整
              let marginClass = '';
              let pairStyleClass = '';

              if (isPairMode) {
                marginClass = (isRightOfPair && col < cols - 1) ? 'mr-5' : '';
                if (!seat.isVoid) {
                  if (isLeftOfPair) {
                    pairStyleClass = 'rounded-r-none border-r border-dashed border-slate-200';
                  } else if (isRightOfPair) {
                    pairStyleClass = 'rounded-l-none border-l-0';
                  }
                }
              } else if (isGroupMode) {
                const mrClass = (colInGroup === 1 && col < cols - 1) ? 'mr-5' : '';
                const mbClass = (rowInGroup === 1 && row < rows - 1) ? 'mb-5' : '';
                marginClass = `${mrClass} ${mbClass}`.trim();

                if (!seat.isVoid) {
                  if (rowInGroup === 0 && colInGroup === 0) {
                    pairStyleClass = 'rounded-tl-xl rounded-tr-none rounded-bl-none rounded-br-none border-r border-b border-dashed border-slate-200';
                  } else if (rowInGroup === 0 && colInGroup === 1) {
                    pairStyleClass = 'rounded-tr-xl rounded-tl-none rounded-bl-none rounded-br-none border-l-0 border-b border-dashed border-slate-200';
                  } else if (rowInGroup === 1 && colInGroup === 0) {
                    pairStyleClass = 'rounded-bl-xl rounded-tl-none rounded-tr-none rounded-br-none border-t-0 border-r border-dashed border-slate-200';
                  } else if (rowInGroup === 1 && colInGroup === 1) {
                    pairStyleClass = 'rounded-br-xl rounded-tl-none rounded-tr-none rounded-bl-none border-t-0 border-l-0';
                  }
                }
              }

              return (
                <div
                  key={index}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDropToSeat(index)}
                  className={`
                    relative h-24 print:h-[5.25rem] rounded-xl border-2 flex flex-col items-center justify-center transition-all duration-200 seat-border
                    ${seat.isVoid 
                      ? 'bg-transparent border-dashed border-slate-300 opacity-50 print:border-none print:opacity-0' 
                      : 'bg-white shadow-sm hover:shadow-md border-slate-200'}
                    ${student ? 'cursor-move' : 'cursor-default'}
                    ${isFixed ? 'ring-2 ring-orange-400 border-orange-100 print:ring-0 print:border-slate-400' : ''}
                    ${pairStyleClass}
                    ${marginClass}
                  `}
                >
                  {/* ペアラベル（枠外上部） */}
                  {isPairMode && isLeftOfPair && !seat.isVoid && (
                    <span className="absolute -top-2.5 left-3 text-[9px] font-bold text-slate-500 bg-slate-200/80 px-1.5 py-0.5 rounded-full select-none z-10 shadow-sm print:bg-slate-200 print:text-slate-700">
                      ペア {pairNumber}
                    </span>
                  )}

                  {/* 班ラベル（枠外上部） */}
                  {isGroupMode && rowInGroup === 0 && colInGroup === 0 && !seat.isVoid && (
                    <span className="absolute -top-2.5 left-3 text-[9px] font-bold text-slate-500 bg-slate-200/80 px-1.5 py-0.5 rounded-full select-none z-10 shadow-sm print:bg-slate-200 print:text-slate-700">
                      {groupNumber}班
                    </span>
                  )}

                  {/* 9ブロック名表示 */}
                  {!seat.isVoid && showBlocks && printMode === 'teacher' && (
                    <span className="absolute bottom-1 left-2 text-[10px] text-slate-400 select-none">
                      {getSeatBlockName(index, rows, cols)}
                    </span>
                  )}
                  {/* 設定ボタン (ホバー時に表示、または常に小さく) */}
                  {!seat.isVoid && printMode === 'teacher' && (
                     <div className="absolute top-1 right-1 opacity-0 hover:opacity-100 print:hidden flex gap-1">
                        <button 
                          onClick={() => toggleVoidSeat(index)}
                          title="机をなくす(空席にする)"
                          className="p-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-500 text-xs"
                        >✕</button>
                     </div>
                  )}
                  {seat.isVoid && printMode === 'teacher' && (
                    <button 
                      onClick={() => toggleVoidSeat(index)}
                      className="absolute inset-0 w-full h-full flex items-center justify-center text-slate-400 hover:text-slate-600 print:hidden"
                    >
                      机を追加
                    </button>
                  )}

                  {!seat.isVoid && student && (
                    <div
                      draggable
                      onDragStart={() => handleDragStartFromSeat(student.id, index)}
                      className="w-full h-full flex flex-col items-center justify-center px-2 relative print:py-0.5"
                    >
                      {printMode === 'teacher' ? (
                        <>
                          {/* 出席番号とチェック欄 */}
                          <div className="w-full flex justify-between items-center text-xs text-slate-400 font-mono mb-1 print:mb-0 px-1">
                            <span>{student.number}</span>
                            <span className="border border-slate-300 rounded w-3.5 h-3.5 print:w-3 print:h-3 flex items-center justify-center text-[9px] bg-white font-sans text-transparent select-none">
                              ✓
                            </span>
                          </div>

                          {/* 氏名 */}
                          {renderStudentName(student.name, false)}
                          
                          {/* 性別・身長 */}
                          <div className="text-[10px] print:text-[8px] text-slate-400 flex gap-2 mt-1 print:mt-0">
                            <span>{student.gender}</span>
                            <span>{student.height}cm</span>
                          </div>

                          {/* 固定ボタン (画面上のみ、印刷時は出さない) */}
                          <div className="absolute bottom-1 right-1 print:hidden flex gap-1">
                             <button 
                                onClick={() => setFixedSeat(student.id, isFixed ? null : index)}
                                title={isFixed ? "固定席を解除" : "この席に固定"}
                                className={`text-[9px] px-1 py-0.5 rounded leading-none ${isFixed ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                             >
                               固定
                             </button>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* 掲示用：氏名のみ */}
                          {renderStudentName(student.name, true)}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 右側：設定パネル (印刷時非表示) */}
      <div className="w-72 bg-white border-l flex flex-col print:hidden shadow-sm z-10 overflow-y-auto">
        <div className="p-4 border-b bg-slate-50">
          <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
            <span className="w-2 h-6 bg-green-500 rounded-sm"></span>
            設定・操作
          </h2>
        </div>

        <div className="p-4 space-y-6">
          {/* 自動配置セクション */}
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <h3 className="font-bold text-blue-800 mb-3 text-sm">自動配置</h3>
            <select 
              value={autoType} 
              onChange={(e) => setAutoType(e.target.value as any)}
              className="w-full p-2 mb-3 rounded-lg border-slate-200 text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="random">ランダムに配置</option>
              <option value="height">身長順（低い子を前方へ）</option>
              <option value="gender">男女をなるべく交互に</option>
            </select>

            {/* ペア条件セクション (pairモードかつ教師用設定のときのみ表示) */}
            {seatMode === 'pair' && printMode === 'teacher' && (
              <div className="mb-4 p-3 bg-white/80 rounded-lg border border-blue-150 space-y-2">
                <h4 className="font-bold text-blue-900 text-xs border-b pb-1">ペア条件</h4>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={pairPreferNear} 
                    onChange={(e) => setPairPreferNear(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>近づけたい子を同じペアにしやすくする</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={pairAvoidNear} 
                    onChange={(e) => setPairAvoidNear(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>離したい子を同じペアにしない</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={pairGenderMixed} 
                    onChange={(e) => setPairGenderMixed(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>男女ペアをできるだけ作る</span>
                </label>
              </div>
            )}

            <button 
              onClick={handleAutoLayout}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-sm transition-colors flex justify-center items-center gap-2"
            >
              自動で配置する
            </button>
            <p className="text-xs text-blue-600 mt-2 opacity-80">※固定席に指定された児童は動きません。</p>
          </div>

          {/* 座席設定セクション */}
          <div className="space-y-3">
             <h3 className="font-bold text-slate-700 text-sm border-b pb-2">座席の基本設定</h3>
             <div className="flex flex-col gap-2 text-sm text-slate-600">
                <span className="text-slate-700 font-medium">座席形態</span>
                <label className="flex items-center gap-2 cursor-pointer">
                   <input 
                     type="radio" 
                     name="seatMode" 
                     value="single" 
                     checked={seatMode === 'single'} 
                     onChange={() => setSeatMode('single')}
                     className="text-blue-600 focus:ring-blue-500"
                   />
                   <span>1人席</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                   <input 
                     type="radio" 
                     name="seatMode" 
                     value="pair" 
                     checked={seatMode === 'pair'} 
                     onChange={() => setSeatMode('pair')}
                     className="text-blue-600 focus:ring-blue-500"
                   />
                   <span>2人組席</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                   <input 
                     type="radio" 
                     name="seatMode" 
                     value="group" 
                     checked={seatMode === 'group'} 
                     onChange={() => setSeatMode('group')}
                     className="text-blue-600 focus:ring-blue-500"
                   />
                   <span>班席</span>
                </label>
             </div>
          </div>

          {/* 印刷形式セクション */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
             <h3 className="font-bold text-slate-700 text-sm border-b pb-2">印刷形式</h3>
             <div className="flex flex-col gap-2 text-sm text-slate-600">
                <label className="flex items-center gap-2 cursor-pointer">
                   <input 
                     type="radio" 
                     name="printMode" 
                     value="teacher" 
                     checked={printMode === 'teacher'} 
                     onChange={() => setPrintMode('teacher')}
                     className="text-blue-600 focus:ring-blue-500"
                   />
                   <span>教師用チェック記入型</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                   <input 
                     type="radio" 
                     name="printMode" 
                     value="display" 
                     checked={printMode === 'display'} 
                     onChange={() => setPrintMode('display')}
                     className="text-blue-600 focus:ring-blue-500"
                   />
                   <span>掲示用きれい版</span>
                </label>
             </div>
          </div>

          {/* 表示設定セクション */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
             <h3 className="font-bold text-slate-700 text-sm border-b pb-2">表示設定</h3>
             <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={showBlocks} 
                  onChange={(e) => setShowBlocks(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>9ブロック名を表示する</span>
             </label>
          </div>

          {/* ツールアクション */}
          <div className="space-y-2 pt-4 border-t border-slate-100">
             <button 
                onClick={() => window.print()}
                className="w-full bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-700 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                印刷する (PDF保存)
              </button>
              
              <button 
                onClick={clearAllSeats}
                className="w-full bg-white border-2 border-red-100 hover:bg-red-50 text-red-600 font-medium py-2 px-4 rounded-lg transition-colors mt-4"
              >
                配置をすべてクリア
              </button>
          </div>

          {/* データ管理 */}
          <div className="pt-6 mt-6 border-t border-slate-200">
            <h3 className="font-bold text-slate-700 text-sm mb-3">データ管理</h3>
            <div className="flex gap-2">
              <button 
                onClick={handleExport}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm py-2 rounded-lg"
              >
                保存
              </button>
              <label className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm py-2 rounded-lg cursor-pointer text-center">
                読込
                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>
            </div>
          </div>

        </div>
      </div>

      {/* 名簿編集モーダル */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 print:hidden backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-11/12 max-w-6xl max-h-[85vh] flex flex-col overflow-hidden border">
            {/* モーダルヘッダー */}
            <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-2.5 h-6 bg-blue-500 rounded-sm"></span>
                  名簿の編集・CSV管理
                </h2>
                <p className="text-xs text-slate-500 mt-1">クラスの児童名簿を編集・追加・削除したり、CSVファイルで一括管理できます。</p>
              </div>
              <button 
                onClick={() => {
                  setStudents(prev => [...prev].sort((a, b) => a.number - b.number));
                  setShowEditModal(false);
                }}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg p-2"
              >
                ✕
              </button>
            </div>

            {/* モーダルコンテンツ */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* CSV操作エリア */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap gap-4 items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-700 text-sm">CSVデータ連携</h3>
                  <p className="text-xs text-slate-500">出席番号,氏名,ふりがな,性別,身長 の並びに対応しています。</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCSVExport}
                    className="bg-white hover:bg-slate-50 border text-slate-700 text-sm font-medium py-2 px-4 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    CSV書き出し
                  </button>
                  <label className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors shadow-sm">
                    CSV取り込み
                    <input 
                      type="file" 
                      accept=".csv" 
                      onChange={handleCSVImport} 
                      className="hidden" 
                    />
                  </label>
                </div>
              </div>

              {/* テーブルエリア */}
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-medium border-b">
                      <th className="p-3 w-20 text-center">出席番号</th>
                      <th className="p-3">氏名</th>
                      <th className="p-3">ふりがな</th>
                      <th className="p-3 w-24">性別</th>
                      <th className="p-3 w-24">身長 (cm)</th>
                      <th className="p-3 w-20 text-center">前方希望</th>
                      <th className="p-3 w-40">近づけたい子</th>
                      <th className="p-3 w-40">離したい子</th>
                      <th className="p-3 w-16 text-center">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.id} className="border-b hover:bg-slate-50/50 transition-colors">
                        <td className="p-2 text-center">
                          <input 
                            type="number" 
                            value={student.number === 0 ? '' : student.number} 
                            onChange={(e) => handleUpdateStudent(student.id, 'number', Number(e.target.value) || 0)} 
                            className="w-16 p-1.5 border rounded text-center font-mono focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            min="1"
                          />
                        </td>
                        <td className="p-2">
                          <input 
                            type="text" 
                            value={student.name} 
                            onChange={(e) => handleUpdateStudent(student.id, 'name', e.target.value)} 
                            className="w-full p-1.5 border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="氏名"
                          />
                        </td>
                        <td className="p-2">
                          <input 
                            type="text" 
                            value={student.kana} 
                            onChange={(e) => handleUpdateStudent(student.id, 'kana', e.target.value)} 
                            className="w-full p-1.5 border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="ふりがな"
                          />
                        </td>
                        <td className="p-2">
                          <select 
                            value={student.gender} 
                            onChange={(e) => handleUpdateStudent(student.id, 'gender', e.target.value)} 
                            className="w-full p-1.5 border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                          >
                            <option value="男">男</option>
                            <option value="女">女</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <input 
                            type="number" 
                            value={student.height === 0 ? '' : student.height} 
                            onChange={(e) => handleUpdateStudent(student.id, 'height', Number(e.target.value) || 0)} 
                            className="w-full p-1.5 border rounded font-mono focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="身長"
                            min="0"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <input 
                            type="checkbox" 
                            checked={student.preferFront || false} 
                            onChange={(e) => handleUpdateStudent(student.id, 'preferFront', e.target.checked)} 
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                        <td className="p-2">
                          <select 
                            value={student.preferNearStudentIds?.[0] || ''} 
                            onChange={(e) => {
                              const val = e.target.value;
                              handleUpdateStudent(student.id, 'preferNearStudentIds', val ? [val] : []);
                            }} 
                            className="w-full p-1.5 border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                          >
                            <option value="">指定なし</option>
                            {students.filter(s => s.id !== student.id).map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <select 
                            value={student.avoidNearStudentIds?.[0] || ''} 
                            onChange={(e) => {
                              const val = e.target.value;
                              handleUpdateStudent(student.id, 'avoidNearStudentIds', val ? [val] : []);
                            }} 
                            className="w-full p-1.5 border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                          >
                            <option value="">指定なし</option>
                            {students.filter(s => s.id !== student.id).map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => handleRemoveStudent(student.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition-colors"
                            title="削除"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                    {students.length === 0 && (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-400">
                          児童が登録されていません。「児童を追加」または「CSV取り込み」を行ってください。
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* モーダルフッター */}
            <div className="p-4 border-t bg-slate-50 flex justify-between items-center">
              <button
                onClick={handleAddStudent}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2 px-4 rounded-lg shadow-sm transition-colors"
              >
                ＋ 児童を追加
              </button>
              <button
                onClick={() => {
                  setStudents(prev => [...prev].sort((a, b) => a.number - b.number));
                  setShowEditModal(false);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 px-6 rounded-lg shadow-sm transition-colors"
              >
                保存して閉じる
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;
