"use client"

import { useState } from "react"
import { createPortal } from "react-dom"
import type React from "react"
import { useEffect, useRef } from "react"
import { Info, X } from "lucide-react"

interface InfoModalProps {
  onMouseDown?: (e: React.MouseEvent) => void
  onMouseMove?: (e: React.MouseEvent) => void
}

export function InfoModal({ onMouseDown, onMouseMove }: InfoModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    console.log("[v0] InfoModal mounted")
  }, [])

  useEffect(() => {
    if (!isOpen) return

    console.log("[v0] InfoModal opened, z-index should be above everything")

    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscKey)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscKey)
    }
  }, [isOpen])

  const modalContent =
    isOpen && mounted ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div
          ref={modalRef}
          className="relative w-full h-full md:w-[80vw] md:max-w-2xl md:max-h-[80vh] overflow-auto bg-black/80 backdrop-blur-md border border-gray-800 rounded-none md:rounded-xl shadow-2xl pointer-events-auto dark-scrollbar"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-gray-800 bg-black/80 backdrop-blur-sm">
            <div>
              <h2 className="text-2xl font-bold text-white">À propos des trajectoires de vie</h2>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-2 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6">
            <div className="space-y-6 text-gray-200">
              <section>
                <h3 className="text-xl font-semibold text-white mb-3">Une vie une trajectoire, une histoire</h3>
                <div className="space-y-3 text-sm leading-relaxed">
                  <p>
                    Imaginons notre monde comme une immense sphère, vivante et en mouvement. Chaque vie y laisse sa
                    trace, chaque parcours influence la réalité sociale et économique. Les trajectoires ne sont jamais
                    linéaires : elles évoluent, progressent, croisent d'autres chemins, elles se heurtent parfois à des
                    obstacles.
                  </p>

                  <p>
                    Chaque personne qui participe à une mesure ou formation est appelé un trekki. Chaque trekki se lance
                    dans son propre trek : un voyage unique à travers les étapes de la vie, nous les guidons pour
                    faciliter leur progression par nos mesures MISt ou la JobtrekSchool.
                  </p>

                  <p>
                    Sur cette sphère interactive, chaque forme circulaire représente un parcours de vie, une vie, une
                    réalité. La forme elle-même raconte une histoire social-économique : les pics montrent les moments
                    de réussite, les vallées les défis rencontrés.
                  </p>

                  <p>
                    En cliquant sur une forme, vous découvrez le détail du trek d'un-e jeune : ses expériences, ses
                    choix, et l'impact social et économique de chacune de ses étapes.
                  </p>
                </div>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-white mb-3">Logiques de calcul</h3>
                <div className="space-y-4 text-sm leading-relaxed">
                  <div>
                    <h4 className="font-semibold text-white mb-2">Statistiques globales :</h4>
                    <p>
                      Les données agrégées dans la modal statistiques représentent l'ensemble des trajectoires
                      collectées. L'amélioration moyenne est calculée en comparant le score cumulatif avant et après
                      l'intervention Jobtrek pour tous les participants. La répartition
                      progression/stagnation/régression analyse l'évolution post-Jobtrek de chaque parcours individuel.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-white mb-2">Vue linéaire avec progression relative :</h4>
                    <p>
                      La progression relative permet de comparer des trajectoires de durées différentes en normalisant
                      leur évolution sur une échelle commune. Cela facilite l'analyse comparative en montrant les
                      tendances d'évolution plutôt que les valeurs absolues, permettant de voir si un parcours
                      progresse, stagne ou régresse indépendamment de sa durée totale.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-white mb-2">Calcul de progression individuelle :</h4>
                    <p>
                      Dans le détail d'un parcours, la progression post-Jobtrek est calculée en comparant le score
                      cumulatif au moment de l'intervention Jobtrek avec le score final du parcours. Le pourcentage
                      d'amélioration reflète l'évolution de l'impact socio-économique après l'intervention, prenant en
                      compte toutes les étapes ultérieures du parcours professionnel.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    ) : null

  return (
    <>
      <button
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onClick={() => setIsOpen(true)}
        className="w-10 h-10 bg-black/50 backdrop-blur-sm text-white rounded-full hover:bg-black/60 hover:border-white/40 transition-colors shadow-lg border border-white/20 flex items-center justify-center"
        aria-label="Informations sur les trajectoires de vie"
        data-ui-element="true"
      >
        <Info size={20} />
      </button>

      {mounted && modalContent && createPortal(modalContent, document.body)}
    </>
  )
}
