// درخت‌واره کامل حساب‌های پارسیان استخراج‌شده از نسخه رسمی سیستم حسابداری مجموعه
export interface ParsianMoeenAccount {
  code: string;
  name: string;
  tafsilis_count: number;
  sample_tafsilis: string[];
}

export interface ParsianKolAccount {
  code: string;
  name: string;
  category: string;
  total_tafsilis: number;
  moeens: ParsianMoeenAccount[];
}

export interface SchoolParsianMapping {
  school_id: number;
  school_name: string;
  tuition_kol: string;
  tuition_moeen: string;
  tuition_moeen_name: string;
  income_kol: string;
  income_moeen: string;
  income_moeen_name: string;
  expense_kol: string;
  expense_kol_name: string;
  bank_kol: string;
  petty_cash_kol: string;
  tafsili_code: string;
}

export const SCHOOL_PARSIAN_MAPPINGS: SchoolParsianMapping[] = [
  {
    school_id: 1,
    school_name: 'دبستان غیر دولتی نور ۱',
    tuition_kol: '67',
    tuition_moeen: '3',
    tuition_moeen_name: 'شهریه دبستان نور 1 (۱۴۳ دانش‌آموز)',
    income_kol: '40',
    income_moeen: '1',
    income_moeen_name: 'درآمد شهریه دبستان نور 1',
    expense_kol: '68',
    expense_kol_name: 'هزینه‌های دبستان نور 1 (۱۱ معین و ۲۰ پرسنل)',
    bank_kol: '11',
    petty_cash_kol: '10',
    tafsili_code: '101'
  },
  {
    school_id: 2,
    school_name: 'دبستان غیر دولتی نور ۲',
    tuition_kol: '67',
    tuition_moeen: '4',
    tuition_moeen_name: 'شهریه دبستان نور 2 (۱۸۳ دانش‌آموز)',
    income_kol: '40',
    income_moeen: '2',
    income_moeen_name: 'درآمد شهریه دبستان نور 2',
    expense_kol: '69',
    expense_kol_name: 'هزینه‌های دبستان نور 2 (۱۲ معین و ۲۳ پرسنل)',
    bank_kol: '11',
    petty_cash_kol: '10',
    tafsili_code: '102'
  },
  {
    school_id: 3,
    school_name: 'دبستان غیر دولتی تبیان ۱',
    tuition_kol: '67',
    tuition_moeen: '1',
    tuition_moeen_name: 'شهریه دبستان تبیان 1 (۱۳۶ دانش‌آموز)',
    income_kol: '40',
    income_moeen: '3',
    income_moeen_name: 'درآمد شهریه دبستان تبیان 1',
    expense_kol: '70',
    expense_kol_name: 'هزینه‌های دبستان تبیان 1 (۱۱ معین و ۱۶ پرسنل)',
    bank_kol: '11',
    petty_cash_kol: '10',
    tafsili_code: '103'
  },
  {
    school_id: 4,
    school_name: 'دبستان غیر دولتی تبیان ۲',
    tuition_kol: '67',
    tuition_moeen: '2',
    tuition_moeen_name: 'شهریه دبستان تبیان 2 (۱۴۰ دانش‌آموز)',
    income_kol: '40',
    income_moeen: '4',
    income_moeen_name: 'درآمد شهریه دبستان تبیان 2',
    expense_kol: '71',
    expense_kol_name: 'هزینه‌های دبستان تبیان 2 (۱۱ معین و ۲۰ پرسنل)',
    bank_kol: '11',
    petty_cash_kol: '10',
    tafsili_code: '104'
  },
  {
    school_id: 5,
    school_name: 'مهدالرضا(ع) شعبه مرکزی صبح',
    tuition_kol: '67',
    tuition_moeen: '10',
    tuition_moeen_name: 'شهریه پیش دبستانی صبح مدرسه القران (۲۲۴ نوگل)',
    income_kol: '40',
    income_moeen: '10',
    income_moeen_name: 'درآمد شهریه پیش دبستانی نوبت صبح مدرسه القران',
    expense_kol: '73',
    expense_kol_name: 'هزینه‌های پیش دبستانی نوبت صبح مدرسه القران',
    bank_kol: '11',
    petty_cash_kol: '10',
    tafsili_code: '105'
  },
  {
    school_id: 6,
    school_name: 'مهدالرضا(ع) شعبه مرکزی عصر',
    tuition_kol: '67',
    tuition_moeen: '11',
    tuition_moeen_name: 'شهریه پیش دبستانی عصر مدرسه القران (۱۲۶ نوگل)',
    income_kol: '40',
    income_moeen: '8',
    income_moeen_name: 'درآمد شهریه پیش دبستانی نوبت عصر مدرسه القران',
    expense_kol: '75',
    expense_kol_name: 'هزینه‌های پیش دبستانی نوبت عصر مدرسه القران',
    bank_kol: '11',
    petty_cash_kol: '10',
    tafsili_code: '106'
  },
  {
    school_id: 7,
    school_name: 'مهدالرضا(ع) شعبه ابراهیم خلیل',
    tuition_kol: '67',
    tuition_moeen: '12',
    tuition_moeen_name: 'شهریه پیش دبستانی ابراهیم خلیل (۴۳ نوگل)',
    income_kol: '40',
    income_moeen: '5',
    income_moeen_name: 'درآمد شهریه پیش دبستانی ابراهیم خلیل',
    expense_kol: '76',
    expense_kol_name: 'هزینه‌های پیش دبستانی ابراهیم خلیل',
    bank_kol: '11',
    petty_cash_kol: '10',
    tafsili_code: '107'
  },
  {
    school_id: 8,
    school_name: 'مهدالرضا(ع) شعبه منظریه',
    tuition_kol: '67',
    tuition_moeen: '9',
    tuition_moeen_name: 'شهریه پیش دبستانی منظریه (۱۵ نوگل)',
    income_kol: '40',
    income_moeen: '9',
    income_moeen_name: 'درآمد شهریه پیش دبستانی منظریه',
    expense_kol: '74',
    expense_kol_name: 'هزینه‌های پیش دبستانی منظریه',
    bank_kol: '11',
    petty_cash_kol: '10',
    tafsili_code: '108'
  },
  {
    school_id: 9,
    school_name: 'مهدالرضا(ع) شعبه سروستان',
    tuition_kol: '67',
    tuition_moeen: '14',
    tuition_moeen_name: 'شهریه پیش دبستانی سروستان (۱۱۹ نوگل)',
    income_kol: '40',
    income_moeen: '7',
    income_moeen_name: 'درآمد شهریه پیش دبستانی سروستان',
    expense_kol: '78',
    expense_kol_name: 'هزینه‌های پیش دبستانی سروستان',
    bank_kol: '11',
    petty_cash_kol: '10',
    tafsili_code: '109'
  },
  {
    school_id: 10,
    school_name: 'مهدالرضا(ع) شعبه تبیان ۲',
    tuition_kol: '67',
    tuition_moeen: '2',
    tuition_moeen_name: 'شهریه مشترک / مهدالرضا تبیان',
    income_kol: '40',
    income_moeen: '4',
    income_moeen_name: 'درآمد شهریه شعبات تبیان',
    expense_kol: '81',
    expense_kol_name: 'هزینه‌های مهدالرضا (کل شعبات)',
    bank_kol: '11',
    petty_cash_kol: '10',
    tafsili_code: '110'
  },
  {
    school_id: 11,
    school_name: 'مهدالرضا(ع) شعبه برهان',
    tuition_kol: '67',
    tuition_moeen: '13',
    tuition_moeen_name: 'شهریه پیش دبستانی کوچه برهان (۹ نوگل)',
    income_kol: '40',
    income_moeen: '6',
    income_moeen_name: 'درآمد شهریه پیش دبستانی کوچه برهان',
    expense_kol: '77',
    expense_kol_name: 'هزینه‌های پیش دبستانی کوچه برهان',
    bank_kol: '11',
    petty_cash_kol: '10',
    tafsili_code: '111'
  }
];

export const PARSIAN_ACCOUNTS_TREE: ParsianKolAccount[] = [
  {
    "code": "10",
    "name": "صندوق",
    "moeens": [
      {
        "code": "1",
        "name": "صندوق",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "2",
        "name": "تنخواه گردانها",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      }
    ],
    "category": "دارایی‌های جاری (نقد، بانک، اسناد)",
    "total_tafsilis": 0
  },
  {
    "code": "11",
    "name": "بانک ها",
    "moeens": [
      {
        "code": "1",
        "name": "بانک صادرات 002",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "3",
        "name": "بانک ملي",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "4",
        "name": "بانک سپه انقلاب",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "5",
        "name": "بانک صادرات009",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "6",
        "name": "بانک رفاه",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      }
    ],
    "category": "دارایی‌های جاری (نقد، بانک، اسناد)",
    "total_tafsilis": 0
  },
  {
    "code": "12",
    "name": "بدهکاران (حسابهاي دريافتني)",
    "moeens": [
      {
        "code": "1",
        "name": "اشخاص متفرقه",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "2",
        "name": "مشتريان",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "4",
        "name": "حساب دريافتني",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      }
    ],
    "category": "دارایی‌های جاری (نقد، بانک، اسناد)",
    "total_tafsilis": 0
  },
  {
    "code": "13",
    "name": "اسناد دريافتني",
    "moeens": [
      {
        "code": "1",
        "name": "اسناد دريافتني",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      }
    ],
    "category": "دارایی‌های جاری (نقد، بانک، اسناد)",
    "total_tafsilis": 0
  },
  {
    "code": "14",
    "name": "اسناد در جريان وصول",
    "moeens": [
      {
        "code": "1",
        "name": "اسناد در جريان وصول",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      }
    ],
    "category": "دارایی‌های جاری (نقد، بانک، اسناد)",
    "total_tafsilis": 0
  },
  {
    "code": "15",
    "name": "موجودي مواد و كالـا",
    "moeens": [
      {
        "code": "1",
        "name": "موجودي مواد اوليه",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "2",
        "name": "موجودي مواد و کالا",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      }
    ],
    "category": "دارایی‌های جاری (نقد، بانک، اسناد)",
    "total_tafsilis": 0
  },
  {
    "code": "16",
    "name": "پيش پرداختها",
    "moeens": [
      {
        "code": "1",
        "name": "پيش پرداخت ماليات",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "2",
        "name": "پيش پرداخت اجاره",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "3",
        "name": "پيش پرداخت هزينه هاي جاري",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      }
    ],
    "category": "دارایی‌های جاری (نقد، بانک، اسناد)",
    "total_tafsilis": 0
  },
  {
    "code": "17",
    "name": "دارايي هاي غير جاري",
    "moeens": [
      {
        "code": "1",
        "name": "اموال ، ماشين آلات و تجهيزات",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "2",
        "name": "استهلاك انباشته اموال ، ماشين آلات وتجهيزات",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "3",
        "name": "زمين",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "4",
        "name": "سرمايه گذاري هاي بلند مدت",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "5",
        "name": "سپرده هاو مطالبات بلند مدت",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "6",
        "name": "ساير دارائيها",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      }
    ],
    "category": "دارایی‌های غیرجاری (اموال، تجهیزات)",
    "total_tafsilis": 0
  },
  {
    "code": "22",
    "name": "اسناد پرداختني",
    "moeens": [
      {
        "code": "1",
        "name": "اسناد پرداختني",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      }
    ],
    "category": "بدهی‌های جاری (بستانکاران، چک‌ها، مالیات)",
    "total_tafsilis": 0
  },
  {
    "code": "23",
    "name": "بستانکاران (حسابهاي پرداختني)",
    "moeens": [
      {
        "code": "1",
        "name": "جناب آقاي تاکي",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      }
    ],
    "category": "بدهی‌های جاری (بستانکاران، چک‌ها، مالیات)",
    "total_tafsilis": 0
  },
  {
    "code": "24",
    "name": "پيش دريافت ها",
    "moeens": [
      {
        "code": "1",
        "name": "پيش دريافت فروش محصولات",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "2",
        "name": "ساير پيش دريافتها",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      }
    ],
    "category": "بدهی‌های جاری (بستانکاران، چک‌ها، مالیات)",
    "total_tafsilis": 0
  },
  {
    "code": "25",
    "name": "ذخيره ماليات",
    "moeens": [
      {
        "code": "1",
        "name": "ماليات بر ارزش افزوده فروش",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "2",
        "name": "ماليات بر ارزش افزوده خريد",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "3",
        "name": "عوارض فروش",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "4",
        "name": "عوارض خريد",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      }
    ],
    "category": "بدهی‌های جاری (بستانکاران، چک‌ها، مالیات)",
    "total_tafsilis": 0
  },
  {
    "code": "26",
    "name": "تسهيلات مالي کوتاه مدت",
    "moeens": [
      {
        "code": "1",
        "name": "تسهيلات مالي کوتاه مدت",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "2",
        "name": "بهره تحقق نيافته",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      }
    ],
    "category": "بدهی‌های جاری (بستانکاران، چک‌ها، مالیات)",
    "total_tafsilis": 0
  },
  {
    "code": "30",
    "name": "حقوق صاحبان سهام",
    "moeens": [
      {
        "code": "1",
        "name": "سرمايه",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "2",
        "name": "اندوخته قانوني",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "3",
        "name": "سود (زيان) انباشته",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "4",
        "name": "سود (زيان) جاري",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "5",
        "name": "تقسيم سود",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      }
    ],
    "category": "حقوق صاحبان سهام و سرمایه",
    "total_tafsilis": 0
  },
  {
    "code": "40",
    "name": "درآمدهاي مردمي وخيرين",
    "moeens": [
      {
        "code": "1",
        "name": "درآمد  شهريه دبستان نور 1",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "2",
        "name": "درآمد شهريه دبستان نور 2",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "3",
        "name": "درآمد شهريه دبستان تبيان 1",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "4",
        "name": "درآمد شهريه  دبستان تبيان 2",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "5",
        "name": "درآمد شهريه پيش دبستاني ابراهيم خليل",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "6",
        "name": "درآمد شهريه پيش دبستاني کوچه برهان",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "7",
        "name": "درآمد شهريه پيش دبستاني سروستان",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "8",
        "name": "درآمد شهريه پيش دبستاني نوبت عصر مدرسه القران",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "9",
        "name": "درآمد شهريه پيش دبستاني منظريه",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "10",
        "name": "درآمد شهريه پيش دبستاني نوبت صبح مدرسه القران",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "11",
        "name": "درآمدهاي غير آموزشي",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "12",
        "name": "درآمد خيرين دکتر مصنع",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "13",
        "name": "درآمد اجاره",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "14",
        "name": "درآمد شهريه کلاس هاي تابستان",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      }
    ],
    "category": "درآمدهای شهریه، خیرین و متفرقه",
    "total_tafsilis": 0
  },
  {
    "code": "50",
    "name": "هزينه ها",
    "moeens": [
      {
        "code": "1",
        "name": "بازارياب",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "2",
        "name": "هزينه حقوق و دستمزد پرسنل مدرسه القرآن",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "3",
        "name": "هزينه استهلاك",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "4",
        "name": "هزينه آب و برق وگاز مصرفي",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "5",
        "name": "هزينه پست و تلفن مدرسه القران",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "6",
        "name": "هزينه اجاره محل",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "7",
        "name": "هزينه ملزومات و نوشت افزار",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "8",
        "name": "هزينه هاي متفرقه",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "9",
        "name": "هزينه حمل",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "200",
        "name": "هزينه بهره بانکي",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "300",
        "name": "هزينه کارمزد بانک",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "302",
        "name": "هزينه انصرافي",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "303",
        "name": "هزينه تعميرات",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "304",
        "name": "هزينه حق الزحمه مربيان مهد",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "305",
        "name": "هزينه پذيرايي",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "306",
        "name": "هزينه خريد وسايل",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "307",
        "name": "هزينه اجاره و کرايه",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "308",
        "name": "هزينه بيمه تامين اجتماعي",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "309",
        "name": "هزينه عمراني",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "310",
        "name": "هزينه کرايه رفت وبرگشت باشگاه",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "311",
        "name": "هزينه اينترنت مدرسه القران",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "312",
        "name": "هزينه هاي کلاس هاي تابستان",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "313",
        "name": "هزينه حقوق ودستمزد نور1",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "314",
        "name": "هزينه حقوق ودستمزد نور2",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "315",
        "name": "هزينه حقوق ودستمزد تبيان1",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "316",
        "name": "هزينه حقوق ودستمزد تبيان2",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "317",
        "name": "هزينه حقوق ودستمزد مهدالرضا",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "318",
        "name": "هزينه هاي بوفه",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "319",
        "name": "هزينه مطالبات سوخت شده",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "320",
        "name": "هزينه هاي عيد غدير",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "321",
        "name": "هزينه حقوق مربيان کلاس هاي تابستان",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      }
    ],
    "category": "هزینه‌های عمومی و تشکیلاتی کل مجموعه",
    "total_tafsilis": 0
  },
  {
    "code": "51",
    "name": "قيمت تمام شده کالاي فروش رفته",
    "moeens": [
      {
        "code": "",
        "name": "معين تعريف نشده",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      }
    ],
    "category": "سایر حساب‌ها و تراز",
    "total_tafsilis": 0
  },
  {
    "code": "60",
    "name": "فروش",
    "moeens": [
      {
        "code": "",
        "name": "معين تعريف نشده",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      }
    ],
    "category": "حساب‌های بازرگانی و فروشگاهی",
    "total_tafsilis": 0
  },
  {
    "code": "61",
    "name": "برگشت  از فروش  و تخفيفات",
    "moeens": [
      {
        "code": "",
        "name": "معين تعريف نشده",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      }
    ],
    "category": "حساب‌های بازرگانی و فروشگاهی",
    "total_tafsilis": 0
  },
  {
    "code": "62",
    "name": "خريــــد",
    "moeens": [
      {
        "code": "",
        "name": "معين تعريف نشده",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      }
    ],
    "category": "حساب‌های بازرگانی و فروشگاهی",
    "total_tafsilis": 0
  },
  {
    "code": "63",
    "name": "برگشت  از خريد و تخفيفات",
    "moeens": [
      {
        "code": "",
        "name": "معين تعريف نشده",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      }
    ],
    "category": "حساب‌های بازرگانی و فروشگاهی",
    "total_tafsilis": 0
  },
  {
    "code": "64",
    "name": "حسابهاي انتظامي",
    "moeens": [
      {
        "code": "",
        "name": "معين تعريف نشده",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      }
    ],
    "category": "حساب‌های انتظامی و تضمینی",
    "total_tafsilis": 0
  },
  {
    "code": "65",
    "name": "طرف حسابهاي انتظامي",
    "moeens": [
      {
        "code": "1",
        "name": "طرف حساب انتظامي بنفع شركت",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "2",
        "name": "طرف حساب انتظامي بعهده شركت",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      }
    ],
    "category": "حساب‌های انتظامی و تضمینی",
    "total_tafsilis": 0
  },
  {
    "code": "66",
    "name": "تراز افتتاحيه",
    "moeens": [
      {
        "code": "1",
        "name": "تراز افتتاحيه",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      }
    ],
    "category": "سایر حساب‌ها و تراز",
    "total_tafsilis": 0
  },
  {
    "code": "67",
    "name": "گردش حساب شهريه دانش آموزان",
    "moeens": [
      {
        "code": "1",
        "name": "شهريه دبستان تبيان 1",
        "tafsilis_count": 136,
        "sample_tafsilis": [
          "فاطمه زهرا احمديان(سوم1404)-1",
          "ديانا رستگار(سوم1404)-2",
          "فاطمه زهرا ترابي(دوم1404)-3"
        ]
      },
      {
        "code": "2",
        "name": "شهريه دبستان تبيان 2",
        "tafsilis_count": 140,
        "sample_tafsilis": [
          "پرنيا حيدريان(ششم1404)-1",
          "فاطمه هاشم پور(ششم1404)-2",
          "مهشيد يعقوبي(ششم1404)-3"
        ]
      },
      {
        "code": "3",
        "name": "شهريه دبستان نور 1",
        "tafsilis_count": 143,
        "sample_tafsilis": [
          "کيان احساني(دوم1404)-1",
          "ياسين دهقاني(سوم1404)-2",
          "محمدجواد نوري(دوم1404)-3"
        ]
      },
      {
        "code": "4",
        "name": "شهريه دبستان نور 2",
        "tafsilis_count": 183,
        "sample_tafsilis": [
          "اميرمحمد ناظم(ششم1403)-1",
          "حامد صديقيان(1403)-2",
          "امير عباس شيرپور(ششم1403)-3"
        ]
      },
      {
        "code": "9",
        "name": "شهريه پيش دبستاني منظريه",
        "tafsilis_count": 15,
        "sample_tafsilis": [
          "السانا رئيسي1403-1",
          "ابوالفضل صفدريان1403-2",
          "ستايش قاسمي1403-3"
        ]
      },
      {
        "code": "10",
        "name": "شهريه پيش دبستاني صبح مدرسه القران",
        "tafsilis_count": 224,
        "sample_tafsilis": [
          "حلما مرتضوي کيا1403-1",
          "فاطمه فخار1403-2",
          "معصومه سادات حجازي1403-3"
        ]
      },
      {
        "code": "11",
        "name": "شهريه پيش دبستاني  عصر مدرسه القران",
        "tafsilis_count": 126,
        "sample_tafsilis": [
          "محمد طاها سعيدي دهکي(1402)-1",
          "مهدي باريکزهي1403-2",
          "سيده زينب رسين1403-3"
        ]
      },
      {
        "code": "12",
        "name": "شهريه پيش دبستاني ابراهيم خليل",
        "tafsilis_count": 43,
        "sample_tafsilis": [
          "سيده آوا موسوي(1402)-1",
          "نگار دهقان(1402)-2",
          "محمد هادي ماهر(1402)-3"
        ]
      },
      {
        "code": "13",
        "name": "شهريه پيش دبستاني کوچه برهان",
        "tafsilis_count": 9,
        "sample_tafsilis": [
          "سيد امير محمد بحريني1404-1",
          "کارن پويان مهر1404-2",
          "اميرعلي رضائي1404-3"
        ]
      },
      {
        "code": "14",
        "name": "شهريه پيش دبستاني سروستان",
        "tafsilis_count": 119,
        "sample_tafsilis": [
          "بنيامين خانبازي(1402)-1",
          "سيد حسين عمادي(1402)-2",
          "سيد ابوالفضل عمادي(1402)-3"
        ]
      }
    ],
    "category": "گردش حساب شهریه دانش‌آموزان (طرف حساب)",
    "total_tafsilis": 1138
  },
  {
    "code": "68",
    "name": "هزينه هاي دبستان نور 1",
    "moeens": [
      {
        "code": "1",
        "name": "هزينه حقوق نور 1",
        "tafsilis_count": 20,
        "sample_tafsilis": [
          "هزينه حقوق محمدرضا آقاسي-1",
          "هزينه حقوق عليرضا نصرت-2",
          "هزينه حقوق مسعود خورشيدسوار-3"
        ]
      },
      {
        "code": "2",
        "name": "هزينه هاي متفرقه نور 1",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "3",
        "name": "هزينه تخفيفات نور 1",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "4",
        "name": "هزينه پذيرايي نور1",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "5",
        "name": "هزينه حمل نور1",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "6",
        "name": "هزينه تلفن نور1",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "7",
        "name": "هزينه اينترنت نور1",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "8",
        "name": "هزينه بيمه دانش آموزي نور1",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "9",
        "name": "هزينه تولد معلمان نور1",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "10",
        "name": "هزينه عيدي نور1",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "11",
        "name": "هزينه مطالبات سوخت شده نور1",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      }
    ],
    "category": "هزینه‌های تفکیک‌شده مدارس و شعب",
    "total_tafsilis": 20
  },
  {
    "code": "69",
    "name": "هزينه هاي دبستان نور 2",
    "moeens": [
      {
        "code": "1",
        "name": "هزينه حقوق نور 2",
        "tafsilis_count": 23,
        "sample_tafsilis": [
          "هزينه حقوق محمد عربي-1",
          "هزينه حقوق حميدرضا دهقانزاد-2",
          "هزينه حقوق سيد محمد حسن ميرنيام-3"
        ]
      },
      {
        "code": "2",
        "name": "هزينه هاي متفرقه نور 2",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "3",
        "name": "هزينه تخفيفات نور 2",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "4",
        "name": "هزينه پذيرايي نور2",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "5",
        "name": "هزينه حمل نور2",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "6",
        "name": "هزينه تلفن نور2",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "7",
        "name": "هزينه اينترنت نور2",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "8",
        "name": "هزينه بيمه دانش آموزي نور2",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "9",
        "name": "هزينه تولد معلمان نور2",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "10",
        "name": "هزينه عيدي نور2",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "11",
        "name": "هزينه مطالبات سوخت شده نور2",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "12",
        "name": "هزينه هديه روز معلم",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      }
    ],
    "category": "هزینه‌های تفکیک‌شده مدارس و شعب",
    "total_tafsilis": 23
  },
  {
    "code": "70",
    "name": "هزينه هاي دبستان تبيان 1",
    "moeens": [
      {
        "code": "1",
        "name": "هزينه حقوق تبيان 1",
        "tafsilis_count": 16,
        "sample_tafsilis": [
          "هزينه حقوق منيره دهقان-1",
          "هزينه حقوق فاطمه آقاسي-2",
          "هزينه حقوق ليلا آزاد-3"
        ]
      },
      {
        "code": "2",
        "name": "هزينه هاي متفرقه تبيان 1",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "3",
        "name": "هزينه تخفيفات تبيان 1",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "4",
        "name": "هزينه پذيرايي تبيان1",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "5",
        "name": "هزينه حمل تبيان1",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "6",
        "name": "بابت هزينه تلفن تبيان1",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "7",
        "name": "هزينه اينترنت تبيان1",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "8",
        "name": "هزينه بيمه دانش آموزان تبيان 1",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "9",
        "name": "هزينه تولد معلمان تبيان1",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "10",
        "name": "هزينه عيدي تبيان1",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "11",
        "name": "هزينه مطالبات سوخت شده تبيان1",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      }
    ],
    "category": "هزینه‌های تفکیک‌شده مدارس و شعب",
    "total_tafsilis": 16
  },
  {
    "code": "71",
    "name": "هزينه هاي دبستان تبيان 2",
    "moeens": [
      {
        "code": "1",
        "name": "هزينه حقوق تبيان 2",
        "tafsilis_count": 20,
        "sample_tafsilis": [
          "هزينه حقوق مريم يحيي آبادي-1",
          "هزينه حقوق ريحانه باقي-3",
          "هزينه حقوق عظمت آقاخاني-4"
        ]
      },
      {
        "code": "2",
        "name": "هزينه هاي متفرقه تبيان 2",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "3",
        "name": "هزينه تخفيفات تبيان 2",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "4",
        "name": "هزينه پذيرايي تبيان2",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "5",
        "name": "هزينه حمل تبيان2",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "6",
        "name": "هزينه تلفن تبيان2 ومهدالرضا کوچه برهان",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "7",
        "name": "هزينه اينترنت تبيان2",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "8",
        "name": "هزينه بيمه دانش آموزي تبيان2",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "9",
        "name": "هزينه تولد معلمان تبيان2",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "10",
        "name": "هزينه عيدي تبيان2",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "11",
        "name": "هزينه مطالبات سوخت شده تبيان2",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      }
    ],
    "category": "هزینه‌های تفکیک‌شده مدارس و شعب",
    "total_tafsilis": 20
  },
  {
    "code": "73",
    "name": "هزينه هاي پيش دبستاني مدرسه القران نوبت صبح",
    "moeens": [
      {
        "code": "1",
        "name": "هزينه تخفيفات پيش دبستاني مدرسه القران نوبت صبح",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "2",
        "name": "هزينه متفرقه مهدالرضا نوبت صبح مدرسه القران",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "3",
        "name": "هزينه تلفن پيش صبح  وعصر مدرسه",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      }
    ],
    "category": "هزینه‌های تفکیک‌شده مدارس و شعب",
    "total_tafsilis": 0
  },
  {
    "code": "74",
    "name": "هزينه هاي پيش دبستاني منظريه",
    "moeens": [
      {
        "code": "1",
        "name": "هزينه تخفيفات پيش دبستاني منظريه",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "2",
        "name": "هزينه تلفن دفتر مهدالرضا منظريه",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      }
    ],
    "category": "هزینه‌های تفکیک‌شده مدارس و شعب",
    "total_tafsilis": 0
  },
  {
    "code": "75",
    "name": "هزينه هاي پيش دبستاني نوبت عصر مدرسه القران",
    "moeens": [
      {
        "code": "1",
        "name": "هزينه تخفيفات پيش دبستاني عصر مدرسه القران",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      }
    ],
    "category": "هزینه‌های تفکیک‌شده مدارس و شعب",
    "total_tafsilis": 0
  },
  {
    "code": "76",
    "name": "هزينه هاي پيش دبستاني ابراهيم خليل",
    "moeens": [
      {
        "code": "1",
        "name": "هزينه تخفيفات پيش دبستاني ابراهيم خليل",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "3",
        "name": "هزينه تلفن ابراهيم خليل",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "4",
        "name": "هزينه هاي متفرقه ابراهيم خليل",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      }
    ],
    "category": "هزینه‌های تفکیک‌شده مدارس و شعب",
    "total_tafsilis": 0
  },
  {
    "code": "77",
    "name": "هزينه هاي پيش دبستاني کوچه برهان",
    "moeens": [
      {
        "code": "1",
        "name": "هزينه تخفيفات پيش دبستاني کوچه برهان",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      }
    ],
    "category": "هزینه‌های تفکیک‌شده مدارس و شعب",
    "total_tafsilis": 0
  },
  {
    "code": "78",
    "name": "هزينه هاي پيش دبستاني سروستان",
    "moeens": [
      {
        "code": "1",
        "name": "هزينه تخفيفات پيش دبستاني سروستان",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "3",
        "name": "هزينه تلفن پيش سروستان",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "4",
        "name": "هزينه هاي متفرقه سروستان",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      }
    ],
    "category": "هزینه‌های تفکیک‌شده مدارس و شعب",
    "total_tafsilis": 0
  },
  {
    "code": "79",
    "name": "هزينه هاي مدرسه القران",
    "moeens": [
      {
        "code": "1",
        "name": "هزينه هاي متفرقه مدرسه القران",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "2",
        "name": "هزينه حقوق مدرسه القران",
        "tafsilis_count": 9,
        "sample_tafsilis": [
          "هزينه حقوق  بهاره همائي-1",
          "هزينه حقوق نبي اله سبزه علي-2",
          "هزينه حقوق علي هاشميان-3"
        ]
      },
      {
        "code": "3",
        "name": "هزينه تلفن مدرسه قران",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "4",
        "name": "هزينه بيمه مدرسه القران",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "5",
        "name": "هزينه تولد پرسنل مدرسه",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "6",
        "name": "هزينه عيدي پرسنل مجموعه",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      }
    ],
    "category": "هزینه‌های تفکیک‌شده مدارس و شعب",
    "total_tafsilis": 9
  },
  {
    "code": "80",
    "name": "هزينه هاي عمراني مدرسه القران",
    "moeens": [
      {
        "code": "1",
        "name": "هزينه هاي عمراني مدرسه القران",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      }
    ],
    "category": "هزینه‌های تفکیک‌شده مدارس و شعب",
    "total_tafsilis": 0
  },
  {
    "code": "81",
    "name": "هزينه هاي مهدالرضا",
    "moeens": [
      {
        "code": "1",
        "name": "هزينه هاي حقوق مربيان مهدالرضا",
        "tafsilis_count": 45,
        "sample_tafsilis": [
          "هزينه حقوق ناهيد احمدي-1",
          "هزينه حقوق زهرا اديب-2",
          "هزينه حقوق محبوبه حداد-3"
        ]
      },
      {
        "code": "2",
        "name": "هزينه هاي متفرقه مهدالرضا",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "3",
        "name": "هزينه بيمه مربيان مهدالرضا",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "4",
        "name": "هزينه تلفن دفتر مسئول مهدالرضا",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "5",
        "name": "هزينه پذيرايي مهد الرضا",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "6",
        "name": "هزينه حمل مهد الرضا",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "7",
        "name": "هزينه تولد مربيان مهد",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "8",
        "name": "هزينه عيدي مربيان مهد",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "9",
        "name": "هزينه مطالبات سوخت شده مهدالرضا",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      },
      {
        "code": "10",
        "name": "هزينه بيمه نوگلان پيش دبستاني کل شعبات",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      }
    ],
    "category": "هزینه‌های تفکیک‌شده مدارس و شعب",
    "total_tafsilis": 45
  },
  {
    "code": "83",
    "name": "هزينه اجاره و کرايه مدرسه القران",
    "moeens": [
      {
        "code": "1",
        "name": "هزينه اجاره و کرايه مدرسه القران",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      }
    ],
    "category": "هزینه‌های تفکیک‌شده مدارس و شعب",
    "total_tafsilis": 0
  },
  {
    "code": "84",
    "name": "درآمدخيرين دکتر مصنع",
    "moeens": [
      {
        "code": "1",
        "name": "خيرين  آقاي دکتر مصنع",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      }
    ],
    "category": "درآمدهای شهریه، خیرین و متفرقه",
    "total_tafsilis": 0
  },
  {
    "code": "85",
    "name": "درآمد خيرين مهندس آربيع",
    "moeens": [
      {
        "code": "1",
        "name": "خيرين مهندس آربيع",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      }
    ],
    "category": "درآمدهای شهریه، خیرین و متفرقه",
    "total_tafsilis": 0
  },
  {
    "code": "86",
    "name": "درآمد خيرين خواهر دکتر مصنع",
    "moeens": [
      {
        "code": "1",
        "name": "خيرين خواهر دکتر مصنع",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      }
    ],
    "category": "درآمدهای شهریه، خیرین و متفرقه",
    "total_tafsilis": 0
  },
  {
    "code": "87",
    "name": "درآمد خيرين دکتر فريدوني",
    "moeens": [
      {
        "code": "1",
        "name": "خيرين دکتر فريدوني",
        "tafsilis_count": 0,
        "sample_tafsilis": []
      }
    ],
    "category": "درآمدهای شهریه، خیرین و متفرقه",
    "total_tafsilis": 0
  }
];
