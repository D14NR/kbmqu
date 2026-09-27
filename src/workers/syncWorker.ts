// Web Worker for Delta Calculation and Background Data Processing

self.onmessage = (event) => {
  const { type, payload } = event.data;

  if (type === "COMPUTE_DELTA") {
    const { localRecords, serverRecords } = payload;
    
    const serverMap = new Map();
    (serverRecords || []).forEach((row: any) => {
      const key = row.id || JSON.stringify(row.data || row);
      serverMap.set(key, row);
    });

    const localMap = new Map();
    (localRecords || []).forEach((item: any) => {
      const key = item.id || JSON.stringify(item);
      localMap.set(key, item);
    });

    const inserts: any[] = [];
    const updates: any[] = [];
    const deletes: any[] = [];

    for (const [key, localItem] of localMap.entries()) {
      if (!serverMap.has(key)) {
        inserts.push(localItem);
      } else {
        const serverItem = serverMap.get(key);
        if (JSON.stringify(localItem) !== JSON.stringify(serverItem)) {
          updates.push({ id: key, record: localItem, oldRecord: serverItem });
        }
      }
    }

    for (const [key, serverItem] of serverMap.entries()) {
      if (!localMap.has(key)) {
        deletes.push({ id: key, record: serverItem });
      }
    }

    self.postMessage({
      type: "DELTA_RESULT",
      payload: { inserts, updates, deletes },
    });
  } else if (type === "PROCESS_SCHEDULE_DATA") {
    const { rawRows, filterCriteria } = payload;
    const processed = (rawRows || []).filter((row: any) => {
      if (!filterCriteria) return true;
      return true;
    });

    self.postMessage({
      type: "SCHEDULE_DATA_PROCESSED",
      payload: { processed },
    });
  }
};
