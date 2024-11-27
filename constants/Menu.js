import {
    UserPlus,
    User,
    CheckSquare,
    Book,
    Calendar,
    MessageSquare,
    Users,
    AlertTriangle,
    FileText,
    Phone,
    MapPinHouse,
    MapPinPlus,
    ShieldCheck,
    Download,
    Mail,
    Gauge,
    ListCheck,
    ListCollapse
    
    
} from 'lucide-react';

export const Menulist = [
    {
        id: "1",
        title: "Admission",
        icon: CheckSquare ,
        submenu: [
            { name: "Our Reference", icon: ListCheck ,href:"/main/page/reference"},
            { name: "Our Courses", icon: Book ,href:"/main/page/courses"},
            { name: "Our Reference Count", icon: ListCollapse ,href:"/main/page/referencecount"},
            { name: "Our Demo Count", icon: ListCollapse ,href:"/main/page/demo"},
            { name: "New Admissions", icon: UserPlus ,href:"/main/page/addquery"},
            { name: "Branch Visits", icon: User ,href:"/main/underdevelopment"},
            { name: "Enrolled Students", icon: CheckSquare ,href:"/main/page/enroll"},
            { name: "Class Scheduling", icon: Calendar ,href:"/main/underdevelopment"},
            { name: "Emergency Contacts", icon: Phone ,href:"/main/underdevelopment"},
        ],
    }, 
    {
        id: "2",
        title: "Branches",
        icon: MapPinHouse,
        submenu: [
            { name: "All Branch", icon: MapPinHouse,href:"/main/page/branch" },
            { name: "New Branch", icon: MapPinPlus,href:"/main/page/addbranch" },
            { name: "Register Staff", icon: ShieldCheck,href:"/main/page/registerstaff" },
            { name: "Staff", icon: Users,href:"/main/page/staff" },
            { name: "Branch Reports", icon: Download,href:"/main/page/branchreport" },
            { name: "Branch Performance", icon: Gauge,href:"/main/page/performance" }
        ],
    },
    // {
    //     id: "5",
    //     title: "Communication",
    //     icon: Mail,
    //     submenu: [
    //         { name: "Email Communication", icon: Mail,href:"/main/underdevelopment" },
    //     ],
    // },
];
