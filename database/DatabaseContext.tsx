import type { SQLiteDatabase } from 'expo-sqlite';
import React, { createContext, useContext } from 'react';

type DatabaseContextType = {
  db: SQLiteDatabase;
};

const DatabaseContext = createContext<DatabaseContextType | undefined>(
  undefined
);

export const DatabaseProvider = ({
  db,
  children,
}: {
  db: SQLiteDatabase;
  children: React.ReactNode;
}) => {
  return (
    <DatabaseContext.Provider value={{ db }}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context.db;
};
