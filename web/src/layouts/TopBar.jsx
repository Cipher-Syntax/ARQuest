import React from 'react'
import { Search, User } from 'lucide-react'
import { useLocation } from 'react-router-dom'

export default function TopBar({ user }) {
	const location = useLocation()



	return (
		<header className="h-16 bg-brand-light border-b border-brand-border px-4 lg:px-8 flex items-center justify-between sticky top-0 z-10">
			<div className="flex items-center gap-6 flex-1">
				{}
				<div className="w-12 lg:hidden" />
			</div>

			<div className="flex items-center gap-3 lg:gap-6">


				<div className="flex items-center gap-3 pl-4 border-l border-brand-border">
					<div className="text-right hidden sm:block">
						<p className="text-sm font-bold text-gray-900 leading-none">
							{user?.name || 'Admin User'}
						</p>
						<p className="text-[10px] font-bold text-brand mt-1 uppercase tracking-wider">
							{user?.role || 'Administrator'}
						</p>
					</div>
					<div className="w-10 h-10 rounded-full bg-white border border-brand-border flex items-center justify-center text-brand shadow-sm">
						<User size={20} />
					</div>
				</div>
			</div>
			

		</header>
	)
}
