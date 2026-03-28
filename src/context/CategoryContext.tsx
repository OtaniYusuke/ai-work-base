import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { categories as initialCategories, type BusinessCategory } from '../data/mockData';

interface CategoryContextType {
  categories: BusinessCategory[];
  addCategory: (name: string, parentId: string | null, icon: string) => BusinessCategory;
}

const CategoryContext = createContext<CategoryContextType | null>(null);

export function CategoryProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<BusinessCategory[]>(initialCategories);

  const addCategory = useCallback((name: string, parentId: string | null, icon: string) => {
    const id = `cat-${Date.now()}`;
    const newCat: BusinessCategory = { id, name, parentId, icon };
    setCategories(prev => [...prev, newCat]);
    return newCat;
  }, []);

  return (
    <CategoryContext.Provider value={{ categories, addCategory }}>
      {children}
    </CategoryContext.Provider>
  );
}

export function useCategories() {
  const ctx = useContext(CategoryContext);
  if (!ctx) throw new Error('useCategories must be used within CategoryProvider');
  return ctx;
}
