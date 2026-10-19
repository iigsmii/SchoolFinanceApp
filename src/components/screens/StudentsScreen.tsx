import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Student } from '../../types';
import { 
  Users, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Phone, 
  Hash, 
  GraduationCap,
  X,
  Loader2,
  AlertCircle
} from 'lucide-react';

export const StudentsScreen: React.FC = () => {
  const { students, schools, currentUser, addStudent, updateStudent, deleteStudent } = useApp();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  
  // فرم دانش‌آموز
  const [formData, setFormData] = useState({
    name: '',
    grade: '',
    phone: '',
    national_id: '',
    school_id: currentUser?.school_id || 1,
  });

  const filteredStudents = students.filter((s) => 
    s.name.includes(searchQuery) || 
    s.phone.includes(searchQuery) || 
    s.national_id.includes(searchQuery)
  );

  const handleOpenModal = (student?: Student) => {
    if (student) {
      setEditingStudent(student);
      setFormData({
        name: student.name,
        grade: student.grade,
        phone: student.phone,
        national_id: student.national_id,
        school_id: student.school_id,
      });
    } else {
      setEditingStudent(null);
      setFormData({
        name: '',
        grade: '',
        phone: '',
        national_id: '',
        school_id: currentUser?.school_id || 1,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    setIsSaving(true);
    try {
      if (editingStudent) {
        // آپدیت دانش‌آموز با await
        await updateStudent(editingStudent.id, formData);
      } else {
        // ثبت دانش‌آموز جدید با await
        await addStudent({
          ...formData,
          active: true,
          father_phone: formData.phone,
          mother_phone: '',
        } as any);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving student:', error);
      alert('خطا در ذخیره‌سازی دانش‌آموز. لطفاً کنسول را بررسی کنید.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (window.confirm(`آیا از حذف دانش‌آموز "${name}" اطمینان دارید؟`)) {
      await deleteStudent(id);
    }
  };

  return (
    <div className="p-4 space-y-4 pb-20 w-full overflow-x-hidden">
      
      {/* هدر صفحه */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">مدیریت دانش‌آموزان</h1>
            <p className="text-xs text-gray-500">{students.length} دانش‌آموز ثبت شده</p>
          </div>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          ثبت جدید
        </button>
      </div>

      {/* نوار جستجو */}
      <div className="relative">
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
          <Search size={18} />
        </div>
        <input
          type="text"
          placeholder="جستجوی نام، تلفن یا کد ملی..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pr-10 pl-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
        />
      </div>

      {/* لیست دانش‌آموزان */}
      <div className="space-y-3">
        {filteredStudents.length === 0 ? (
          <div className="text-center py-10 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
            <Users size={48} className="mx-auto text-gray-300 mb-3" />
            <p>هیچ دانش‌آموزی یافت نشد.</p>
          </div>
        ) : (
          filteredStudents.map((student) => (
            <div key={student.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                    {student.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{student.name}</h3>
                    <p className="text-xs text-gray-500">{student.school_name}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleOpenModal(student)} className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(student.id, student.name)} className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-gray-50 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <GraduationCap size={16} className="text-gray-400" />
                  <span>پایه: {student.grade}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone size={16} className="text-gray-400" />
                  <span dir="ltr">{student.phone || '---'}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 col-span-2">
                  <Hash size={16} className="text-gray-400" />
                  <span>کد ملی: {student.national_id}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* مودال ثبت / ویرایش */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-800">
                {editingStudent ? 'ویرایش دانش‌آموز' : 'ثبت دانش‌آموز جدید'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نام و نام خانوادگی</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">پایه تحصیلی</label>
                  <input
                    type="text"
                    required
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">شماره تماس</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">کد ملی</label>
                <input
                  type="text"
                  required
                  value={formData.national_id}
                  onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">مدرسه</label>
                <select
                  value={formData.school_id}
                  onChange={(e) => setFormData({ ...formData, school_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>{school.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  disabled={isSaving}
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex justify-center items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      در حال ذخیره...
                    </>
                  ) : (
                    'ذخیره'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
