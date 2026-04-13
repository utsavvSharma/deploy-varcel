import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex flex-col items-center justify-center p-8">
      {/* Logo and Header */}
      <div className="text-center mb-12 animate-slide-down">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 rounded-xl blur-xl opacity-30"></div>
            <Image
              src="/images/infobeamLogo.png"
              alt="InfoBeam Solution"
              width={120}
              height={120}
              className="rounded-xl shadow-sxl relative z-10"
            />
          </div>
        </div>
        <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-black to-gray-900 bg-clip-text text-transparent">InfoBeam CRM</h1>
        <p className="text-xl text-gray-600 mb-2 font-medium">Customer Relationship Management System</p>
        <p className="text-gray-500 max-w-md mx-auto">Streamline your sales process and manage leads effectively</p>
      </div>

      {/* Login Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl w-full">
        {/* Admin Login Card */}
        <div className="group relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-blue-100 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="text-center relative z-10">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Admin Portal</h2>
            <p className="text-gray-600 mb-6 text-sm">Manage leads, team members, and system settings</p>
            <Link
              href="/admin/login"
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 hover:shadow-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 inline-block text-center active:scale-95"
            >
              Admin Login →
            </Link>
          </div>
        </div>

        {/* Team Leader Login Card */}
        <div className="group relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-purple-100 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="text-center relative z-10">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Team Leader</h2>
            <p className="text-gray-600 mb-6 text-sm">Manage your team, monitor performance, and oversee leads</p>
            <Link
              href="/team-leader/login"
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-700 text-white py-3 px-6 rounded-lg font-medium hover:from-purple-700 hover:to-indigo-800 hover:shadow-lg focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 inline-block text-center active:scale-95"
            >
              Team Leader Login →
            </Link>
          </div>
        </div>

        {/* Sales Login Card */}
        <div className="group relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-emerald-100 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="text-center relative z-10">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Sales Portal</h2>
            <p className="text-gray-600 mb-6 text-sm">Access your leads, manage follow-ups, and track progress</p>
            <Link
              href="/sales/login"
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-3 px-6 rounded-lg font-medium hover:from-emerald-700 hover:to-emerald-800 hover:shadow-lg focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200 inline-block text-center active:scale-95"
            >
              Sales Login →
            </Link>
          </div>
        </div>
      </div>
            

            {/* New Team Member Card */}
<div className="group relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-orange-100 overflow-hidden">
  <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
  
  <div className="text-center relative z-10">
    
    <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v6m3-3h-6M12 20h9M12 4v4m0 0a4 4 0 110 8 4 4 0 010-8z" />
      </svg>
    </div>

    <h2 className="text-2xl font-semibold text-gray-900 mb-2">
      New Team Member
    </h2>

    <p className="text-gray-600 mb-6 text-sm">
      Add a new member to your team and assign roles
    </p>

    <Link
      href="/register"
      className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-6 rounded-lg font-medium hover:from-orange-600 hover:to-red-600 hover:shadow-lg focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all duration-200 inline-block text-center active:scale-95"
    >
      Add Member →
    </Link>

  </div>
</div>
  {/* New Team Member Card */}
<div className="group relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-orange-100 overflow-hidden">
  <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
  
  <div className="text-center relative z-10">
    
    <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v6m3-3h-6M12 20h9M12 4v4m0 0a4 4 0 110 8 4 4 0 010-8z" />
      </svg>
    </div>

    <h2 className="text-2xl font-semibold text-gray-900 mb-2">
      New Lead 
    </h2>

    <p className="text-gray-600 mb-6 text-sm">
      Add a new member to your team and assign roles
    </p>

    <Link
      href="/register"
      className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-6 rounded-lg font-medium hover:from-orange-600 hover:to-red-600 hover:shadow-lg focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all duration-200 inline-block text-center active:scale-95"
    >
      Add Member →
    </Link>

  </div>
</div>
      

      {/* Features Section */}
      <div className="mt-16 max-w-4xl w-full">
        <h3 className="text-2xl font-semibold text-gray-900 text-center mb-8">Key Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="group text-center bg-white/50 backdrop-blur-sm rounded-xl p-6 hover:bg-white/80 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-md">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Lead Management</h4>
            <p className="text-sm text-gray-600">Organize and track leads throughout the sales pipeline</p>
          </div>
          <div className="group text-center bg-white/50 backdrop-blur-sm rounded-xl p-6 hover:bg-white/80 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-md">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Follow-up Reminders</h4>
            <p className="text-sm text-gray-600">Never miss important client follow-ups with automated reminders</p>
          </div>
          <div className="group text-center bg-white/50 backdrop-blur-sm rounded-xl p-6 hover:bg-white/80 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-md">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Analytics & Reports</h4>
            <p className="text-sm text-gray-600">Track performance with detailed analytics and reporting</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-16">
        <p className="text-sm text-gray-500">
          © 2025 InfoBeam Solution. All rights reserved.
        </p>
      </div>
    </div>
  );
}
