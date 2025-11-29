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
        icon: CheckSquare,
        submenu: [
            { name: "Our Reference", icon: ListCheck, href: "/main/page/reference" },
            { name: "Our Courses", icon: Book, href: "/main/page/courses" },
            { name: "Our Reference Count", icon: ListCollapse, href: "/main/page/referencecount" },
            { name: "Our Demo Count", icon: ListCollapse, href: "/main/page/demo" },
            { name: "New Admissions", icon: UserPlus, href: "/main/page/addquery" },
            { name: "Enrolled Students", icon: CheckSquare, href: "/main/page/enroll" },
        ],
    },
    {
        id: "2",
        title: "Branches",
        icon: MapPinHouse,
        submenu: [
            { name: "All Branch", icon: MapPinHouse, href: "/main/page/branch" },
            { name: "New Branch", icon: MapPinPlus, href: "/main/page/addbranch" },
            { name: "Register Staff", icon: ShieldCheck, href: "/main/page/registerstaff" },
            { name: "Staff", icon: Users, href: "/main/page/staff" },
        ],
    },
    {
        id: "3",
        title: "Franchise",
        icon: Phone,
        submenu: [
            { name: "Franchise Branch", icon: Gauge, href: "/main/page/franchise" },
            { name: "Franchise Staff", icon: Gauge, href: "/main/page/franchisestaff" },

            { name: "Franchise All Query", icon: Gauge, href: "/main/page/fran/allquery" },
            { name: "Franchise Today", icon: Gauge, href: "/main/page/fran/today" },
            { name: "Franchise Important", icon: Gauge, href: "/main/page/fran/important" },
            { name: "Franchise Trash", icon: Gauge, href: "/main/page/fran/trash" },
            { name: "Franchise Report", icon: Gauge, href: "/main/page/fran/report" },
        ],
    }
];
