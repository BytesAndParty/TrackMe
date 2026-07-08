import { type Project } from '../../db'

interface ProjectOptionsProps {
  projects: Project[]
}

export default function ProjectOptions({ projects }: ProjectOptionsProps) {
  return (
    <>
      {projects
        .filter((p) => p.active)
        .map((p) => (
          <option key={p.id} value={p.id}>
            {p.key} – {p.name}
          </option>
        ))}
    </>
  )
}
